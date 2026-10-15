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
//   node scripts/tasks.mjs pull --api <url> --token <reviewer token>   # staged bundles from the API into contributions/
//   ... receipt <bundle.json> ... [--api <url> --token <t>]           # also records the decision against the staged bundle
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectPII } from '../src/lib/pii.js';
import { LEASE_DAYS, leaseState, buildPrompt, checkBundle, makeReceipt } from '../src/lib/bundles.js';
export { LEASE_DAYS, MAX_QUOTE_WORDS, PRESS_HOSTS, leaseState, buildPrompt, checkBundle, makeReceipt } from '../src/lib/bundles.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TASKS = path.join(ROOT, 'tasks', 'tasks.json');
const SCHEMA = path.join(ROOT, 'tasks', 'bundle.schema.json');
const RECEIPTS = path.join(ROOT, 'receipts', 'lend.json');
const LEDGER = path.join(ROOT, 'estimates', 'ledger.json');
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
    if (opt('--api') && opt('--token')) {
      const bid = 'b-' + receipt.bundle_sha256.slice(0, 24);
      const res = await fetch(opt('--api').replace(/\/+$/, '') + '/v1/review/bundles/' + bid, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + opt('--token') }, body: JSON.stringify({ decision: decision === 'rejected' ? 'declined' : decision, receipt_id: receipt.id }) });
      console.log(res.ok ? `API: ${bid} marked ${decision}` : `API: could not mark ${bid} (${res.status}); the receipt is written locally`);
    }
    const t = board.tasks.find((x) => x.id === bundle.task_id);
    if (t && decision === 'accepted') { t.status = 'done'; t.done_receipt = receipt.id; t.claimed_by = null; t.claimed_until = null; }
    if (t && decision !== 'accepted') { t.claimed_by = null; t.claimed_until = null; if (t.status === 'claimed') t.status = 'open'; }
    await saveBoard(board);
    console.log(`${receipt.id}  ${decision}  ${receipt.task_id}  by ${receipt.handle} (${receipt.agent})  sha256 ${receipt.bundle_sha256}`);
    if (receipt.next_tasks.length) console.log(`${receipt.next_tasks.length} follow-up(s) proposed; promote with: node scripts/tasks.mjs promote ${receipt.id} <n>`);
  } else if (cmd === 'pull') {
    const api = opt('--api', arg && arg.startsWith('http') ? arg : null); const token = opt('--token');
    if (!api || !token) { console.error('--api <url> and --token <reviewer token> are required'); process.exit(2); }
    const res = await fetch(api.replace(/\/+$/, '') + '/v1/review/bundles', { headers: { authorization: 'Bearer ' + token } });
    if (!res.ok) { console.error(`API ${res.status}`); process.exit(1); }
    const { data } = await res.json();
    const dir = path.join(ROOT, 'contributions'); let n = 0;
    for (const b of data) {
      const f = path.join(dir, `${b.task_id}-${slug(b.handle || 'anonymous')}-${b.id.slice(2, 10)}.json`);
      await writeFile(f, JSON.stringify(JSON.parse(b.payload), null, 1) + '\n'); n++;
      console.log(`${b.id}  ${b.task_id}  ${b.handle} (${b.agent})  ${b.bundle_status}  warnings ${JSON.parse(b.warnings).length}  → ${path.relative(ROOT, f)}`);
    }
    console.log(`${n} staged bundle(s) written; run check-all, then receipt each with --api and --token`);
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
