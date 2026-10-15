#!/usr/bin/env node
// The task board for "Lend your agent an hour": list tasks, print a prompt pack, hold a claim, check a returned
// bundle, write a receipt, and promote an accepted bundle's follow-ups onto the board.
//
//   node scripts/tasks.mjs list [--all]                       # open tasks (--all includes claimed and done)
//   node scripts/tasks.mjs prompt <task-id>                   # the full prompt pack to paste into any agent
//   node scripts/tasks.mjs claim <task-id> --handle <h>       # seven-day lease; lapses by itself
//   node scripts/tasks.mjs release <task-id>
//   node scripts/tasks.mjs check <bundle.json> [--json]       # machine checks: schema, PII, quotes, domains, sums
//   node scripts/tasks.mjs check-all                          # every file in contributions/ (CI runs this)
//   node scripts/tasks.mjs receipt <bundle.json> --reviewer <h> --decision accepted|rejected|needs-work [--release 0.4.0] [--note "..."]
//   node scripts/tasks.mjs promote <receipt-id> <n> [--kind row|verify|method] [--size S|M|L]
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectPII } from '../src/lib/pii.js';
import { canonicalJSON, sha256Hex } from '../src/lib/hash.js';
import { validate } from '../src/lib/minischema.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TASKS = path.join(ROOT, 'tasks', 'tasks.json');
const SCHEMA = path.join(ROOT, 'tasks', 'bundle.schema.json');
const RECEIPTS = path.join(ROOT, 'receipts', 'lend.json');
const LEDGER = path.join(ROOT, 'estimates', 'ledger.json');
export const LEASE_DAYS = 7;
export const MAX_QUOTE_WORDS = 25;

// Hosts that report figures rather than produce them. A row graded A or B must not rest on one of these.
export const PRESS_HOSTS = ['bbc.co.uk', 'bbc.com', 'cnn.com', 'reuters.com', 'apnews.com', 'nytimes.com', 'theguardian.com', 'washingtonpost.com', 'foxnews.com', 'nbcnews.com', 'abcnews.go.com', 'cbsnews.com', 'dailymail.co.uk', 'independent.co.uk', 'telegraph.co.uk', 'aljazeera.com', 'yahoo.com', 'msn.com', 'wikipedia.org', 'medium.com', 'substack.com', 'x.com', 'twitter.com', 'facebook.com', 'reddit.com', 'youtube.com'];

const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; } };
const isPress = (h) => !!h && PRESS_HOSTS.some((p) => h === p || h.endsWith('.' + p));
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

/** open | claimed | done, treating a lapsed lease as open. */
export function leaseState(task, now = Date.now()) {
  if (task.status === 'done') return 'done';
  if (task.claimed_by && task.claimed_until && Date.parse(task.claimed_until) > now) return 'claimed';
  return 'open';
}

/** The prompt pack: the versioned preamble, then the task, its inputs and its acceptance checks. */
export function buildPrompt(task, preamble) {
  const lines = [preamble.trim(), '', `## Task ${task.id}`, '', task.title, '', task.ask, '', '## Inputs'];
  for (const i of task.inputs) lines.push(`- ${i}`);
  lines.push('', '## The reviewer will check that');
  for (const a of task.accept) lines.push(`- ${a}`);
  if (task.rows?.length) lines.push('', `Ledger rows this task touches: ${task.rows.join(', ')}. Use these ids in "corrections".`);
  lines.push('', `Set "task_id" to "${task.id}". If you cannot complete it, return status "not-found" or "partial" and say what you tried.`);
  return lines.join('\n') + '\n';
}

/**
 * Machine checks on a returned bundle. Errors block; warnings go to the reviewer.
 * @param {any} bundle
 * @param {{schema:any, tasks?:any[], ledgerIds?:Set<string>, preambleVersion?:string}} ctx
 */
export function checkBundle(bundle, ctx) {
  const errors = []; const warnings = [];
  for (const p of validate(ctx.schema, bundle)) errors.push(`${p.path}: ${p.message}`);
  if (errors.length) return { ok: false, errors, warnings };

  const pii = detectPII(bundle);
  if (pii.length) errors.push(`possible personal data (${pii.join(', ')}); a person must look before anything is merged`);

  const task = ctx.tasks?.find((t) => t.id === bundle.task_id);
  if (ctx.tasks && !task) errors.push(`task_id "${bundle.task_id}" is not on the board`);
  if (ctx.preambleVersion && bundle.preamble_version !== ctx.preambleVersion) warnings.push(`made with prompt pack ${bundle.preamble_version}; the board is on ${ctx.preambleVersion}`);

  if (bundle.status === 'done' && !bundle.rows.length && !bundle.corrections.length) errors.push('status "done" with no rows and no corrections');
  if (bundle.status === 'done' && !bundle.evidence.length) errors.push('status "done" with no evidence');
  if (bundle.status === 'not-found' && !bundle.tried.length) errors.push('status "not-found" without a list of what was tried');

  const seen = new Set();
  const nums = [];
  for (const r of bundle.rows) {
    if (seen.has(r.id)) errors.push(`row id "${r.id}" appears twice`); seen.add(r.id);
    if (ctx.ledgerIds?.has(r.id)) errors.push(`row id "${r.id}" already exists in the ledger; send a correction instead, or choose a new id`);
    const h = host(r.url);
    if (!h || !/^https?:$/.test(new URL(r.url).protocol)) errors.push(`row "${r.id}": url is not an http(s) address`);
    else if ((r.grade === 'A' || r.grade === 'B') && isPress(h)) errors.push(`row "${r.id}": grade ${r.grade} rests on ${h}, which reports figures rather than producing them; grade C or find the primary source`);
    if (r.low != null && r.high != null && r.low > r.high) errors.push(`row "${r.id}": low is above high`);
    if (/\b(?:sum(?:med)?|combined|added together|total of .* and)\b/i.test(`${r.scope} ${r.note || ''}`)) warnings.push(`row "${r.id}" describes a sum; check it is the source's own total, not the agent's`);
    if (typeof r.low === 'number' && r.low > 0) nums.push([r.id, r.low]);
  }
  for (const [id, v] of nums) for (const [a, x] of nums) for (const [b, y] of nums) {
    if (a < b && a !== id && b !== id && x + y === v) warnings.push(`row "${id}" equals "${a}" + "${b}"; figures must not be summed across rows`);
  }
  for (const c of bundle.corrections) {
    if (ctx.ledgerIds && !ctx.ledgerIds.has(c.row_id)) errors.push(`correction for "${c.row_id}", which is not a ledger row`);
    if (task?.rows?.length && !task.rows.includes(c.row_id)) warnings.push(`correction for "${c.row_id}", which the task did not mention`);
  }
  for (const [i, e] of bundle.evidence.entries()) {
    const n = words(e.quote);
    if (n > MAX_QUOTE_WORDS) errors.push(`evidence[${i}]: quote is ${n} words; the limit is ${MAX_QUOTE_WORDS}`);
    if (!host(e.url)) errors.push(`evidence[${i}]: url is not an address`);
  }
  if (bundle.status === 'done') {
    const cited = new Set(bundle.evidence.map((e) => host(e.url)));
    for (const r of bundle.rows) if (!cited.has(host(r.url))) warnings.push(`row "${r.id}" cites ${host(r.url)} but no evidence quote comes from that site`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

/** A receipt: who did what, with which agent, hashed so anyone can check it against the bundle. */
export async function makeReceipt(bundle, { reviewer, decision, release = null, note = '', now = new Date() }) {
  const sha = await sha256Hex(canonicalJSON(bundle));
  return {
    id: 'rcpt-' + sha.slice(0, 10), task_id: bundle.task_id, handle: bundle.contributor.handle, agent: bundle.contributor.agent,
    status: bundle.status, preamble_version: bundle.preamble_version, bundle_sha256: sha, decision, reviewer, reviewed: now.toISOString(),
    changed: { rows: bundle.rows.length, corrections: bundle.corrections.length, evidence: bundle.evidence.length, next_tasks: bundle.next_tasks.length },
    release, note, next_tasks: bundle.next_tasks,
  };
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

async function loadBoard() { return JSON.parse(await readFile(TASKS, 'utf8')); }
async function saveBoard(b) { await writeFile(TASKS, JSON.stringify(b, null, 1) + '\n'); }
async function loadReceipts() { try { return JSON.parse(await readFile(RECEIPTS, 'utf8')); } catch { return { schema: 'lifesavinglab.receipts.v1', receipts: [] }; } }
async function ledgerIds() { try { return new Set(JSON.parse(await readFile(LEDGER, 'utf8')).rows.map((r) => r.id)); } catch { return undefined; } }

async function main() {
  const [cmd, arg, ...rest] = process.argv.slice(2);
  const opt = (n, d) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : d; };
  const has = (n) => rest.includes(n) || arg === n;
  const board = await loadBoard();
  const find = () => { const t = board.tasks.find((x) => x.id === arg); if (!t) { console.error(`no task ${arg}`); process.exit(2); } return t; };

  if (!cmd || cmd === 'list') {
    const all = has('--all');
    const rows = board.tasks.filter((t) => all || leaseState(t) === 'open');
    console.log(`board ${board.version} · prompt pack ${board.preamble_version} · ${rows.length} task${rows.length === 1 ? '' : 's'}`);
    for (const t of rows) console.log(`${t.id.padEnd(34)} ${leaseState(t).padEnd(8)} ${t.kind.padEnd(7)} ${t.size}  ${t.title}`);
  } else if (cmd === 'prompt') {
    process.stdout.write(buildPrompt(find(), board.preamble));
  } else if (cmd === 'claim') {
    const t = find(); const handle = opt('--handle');
    if (!handle) { console.error('--handle is required'); process.exit(2); }
    if (detectPII(handle).length) { console.error('a handle must not be an email address or phone number'); process.exit(2); }
    if (leaseState(t) === 'claimed' && t.claimed_by !== handle) { console.error(`claimed by ${t.claimed_by} until ${t.claimed_until}`); process.exit(1); }
    if (leaseState(t) === 'done') { console.error('already done'); process.exit(1); }
    t.claimed_by = handle; t.claimed_until = new Date(Date.now() + LEASE_DAYS * 86400000).toISOString(); t.status = 'claimed';
    await saveBoard(board); console.log(`${t.id} held for ${handle} until ${t.claimed_until}`);
  } else if (cmd === 'release') {
    const t = find(); t.claimed_by = null; t.claimed_until = null; if (t.status === 'claimed') t.status = 'open';
    await saveBoard(board); console.log(`${t.id} released`);
  } else if (cmd === 'check-all') {
    const dir = path.join(ROOT, 'contributions');
    const schema = JSON.parse(await readFile(SCHEMA, 'utf8')); const ids = await ledgerIds();
    const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
    let bad = 0;
    for (const f of files) {
      const result = checkBundle(JSON.parse(await readFile(path.join(dir, f), 'utf8')), { schema, tasks: board.tasks, ledgerIds: ids, preambleVersion: board.preamble_version });
      console.log(`${result.ok ? 'ok  ' : 'FAIL'} ${f}${result.errors.length ? '\n  ' + result.errors.join('\n  ') : ''}`);
      if (!result.ok) bad++;
    }
    console.log(`${files.length} bundle(s), ${bad} failing`); process.exit(bad ? 1 : 0);
  } else if (cmd === 'check' || cmd === 'receipt') {
    const bundle = JSON.parse(await readFile(arg, 'utf8'));
    const schema = JSON.parse(await readFile(SCHEMA, 'utf8'));
    const result = checkBundle(bundle, { schema, tasks: board.tasks, ledgerIds: await ledgerIds(), preambleVersion: board.preamble_version });
    if (cmd === 'check') {
      if (has('--json')) console.log(JSON.stringify(result, null, 1));
      else { for (const e of result.errors) console.log('ERROR    ' + e); for (const w of result.warnings) console.log('warning  ' + w); console.log(result.ok ? 'machine checks passed; a person decides next' : 'machine checks failed'); }
      process.exit(result.ok ? 0 : 1);
    }
    const reviewer = opt('--reviewer'); const decision = opt('--decision');
    if (!reviewer || !['accepted', 'rejected', 'needs-work'].includes(decision)) { console.error('--reviewer and --decision accepted|rejected|needs-work are required'); process.exit(2); }
    if (!result.ok && decision === 'accepted') { console.error('machine checks failed; fix the bundle or decide needs-work:\n' + result.errors.join('\n')); process.exit(1); }
    const receipt = await makeReceipt(bundle, { reviewer, decision, release: opt('--release', null), note: opt('--note', '') });
    const r = await loadReceipts();
    if (r.receipts.some((x) => x.bundle_sha256 === receipt.bundle_sha256)) { console.error('this exact bundle already has a receipt'); process.exit(1); }
    r.receipts.unshift(receipt); await writeFile(RECEIPTS, JSON.stringify(r, null, 1) + '\n');
    const t = board.tasks.find((x) => x.id === bundle.task_id);
    if (t && decision === 'accepted') { t.status = 'done'; t.done_receipt = receipt.id; t.claimed_by = null; t.claimed_until = null; }
    if (t && decision !== 'accepted') { t.claimed_by = null; t.claimed_until = null; if (t.status === 'claimed') t.status = 'open'; }
    await saveBoard(board);
    console.log(`${receipt.id}  ${decision}  ${receipt.task_id}  by ${receipt.handle} (${receipt.agent})  sha256 ${receipt.bundle_sha256}`);
    if (receipt.next_tasks.length) console.log(`${receipt.next_tasks.length} follow-up(s) proposed; promote with: node scripts/tasks.mjs promote ${receipt.id} <n>`);
  } else if (cmd === 'promote') {
    const r = await loadReceipts(); const rc = r.receipts.find((x) => x.id === arg);
    const n = Number(rest[0]); const nt = rc?.next_tasks?.[n];
    if (!rc || !nt) { console.error('receipt or follow-up not found'); process.exit(2); }
    const id = slug(nt.title); if (board.tasks.some((t) => t.id === id)) { console.error(`task ${id} already exists`); process.exit(1); }
    board.tasks.push({ id, title: nt.title, kind: opt('--kind', 'row'), size: opt('--size', 'S'), status: 'open', ask: `${nt.title}. ${nt.why}`, inputs: [`Proposed in receipt ${rc.id} after task ${rc.task_id}`],
      accept: ['Rows or corrections with a primary source each', 'A quote of 25 words or fewer per source', 'Nothing summed across rows'], rows: [], unlocks: nt.why, parent: rc.task_id,
      claimed_by: null, claimed_until: null, created: new Date().toISOString().slice(0, 10), done_receipt: null });
    await saveBoard(board); console.log(`added ${id}`);
  } else { console.error('unknown command'); process.exit(2); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
