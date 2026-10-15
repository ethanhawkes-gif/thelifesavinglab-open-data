// Pure helpers for the task board and returned bundles. No Node imports: used by the CLI, the Worker and the tests.
import { detectPII } from './pii.js';
import { canonicalJSON, sha256Hex } from './hash.js';
import { validate } from './minischema.js';

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

