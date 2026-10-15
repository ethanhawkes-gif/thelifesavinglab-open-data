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

/**
 * Two agents, one task: compare every bundle returned for the same task. Independent agreement on a correction's
 * value is cheap evidence; disagreement sends the row to a person. Returns per-(row, field) verdicts and host overlap.
 */
export function agreement(bundles) {
  const norm = (v) => String(v ?? '').toLowerCase().replace(/[\s,]+/g, ' ').trim();
  // Figures as printed differ in wording ("66 000 deaths" vs "66,000"); compare the numbers they carry as well.
  const numbers = (v) => (String(v ?? '').replace(/(\d)[ ,](?=\d{3}\b)/g, '$1').match(/\d+(?:\.\d+)?/g) || []).map(Number);
  // Same figures: the first number printed is the same and every number in the shorter value appears in the longer (extra context such as a share or a year is allowed).
  const sameNumbers = (vals) => { const sets = vals.map(numbers); if (sets.some((n) => !n.length)) return false; const first = sets[0][0]; if (!sets.every((n) => n[0] === first)) return false; const longest = sets.reduce((a, b) => (b.length > a.length ? b : a)); return sets.every((n) => n.every((x) => longest.includes(x))); };
  const byKey = new Map();
  for (const [i, b] of bundles.entries()) {
    for (const c of b.corrections || []) {
      const k = c.row_id + '\u0000' + c.field;
      if (!byKey.has(k)) byKey.set(k, { row_id: c.row_id, field: c.field, values: new Map() });
      const e = byKey.get(k); const v = norm(c.new);
      if (!e.values.has(v)) e.values.set(v, { value: c.new, by: [] });
      e.values.get(v).by.push(b.contributor?.handle || `bundle ${i + 1}`);
    }
  }
  const items = [...byKey.values()].map((e) => {
    const values = [...e.values.values()];
    const everyone = values.reduce((n, v) => n + v.by.length, 0) === bundles.length && new Set(values.flatMap((v) => v.by)).size === bundles.length;
    const sameText = values.length === 1 && everyone;
    const sameFigures = !sameText && everyone && sameNumbers(values.map((v) => v.value));
    return { row_id: e.row_id, field: e.field, values, agreed: sameText || sameFigures, same_figures_different_words: sameFigures, contested: values.length > 1 && !sameFigures && everyone, partial: !everyone };
  });
  const hosts = bundles.map((b) => new Set((b.evidence || []).map((e) => { try { return new URL(e.url).hostname.replace(/^www\./, ''); } catch { return null; } }).filter(Boolean)));
  const shared = hosts.length ? [...hosts[0]].filter((h) => hosts.every((s) => s.has(h))) : [];
  return { bundles: bundles.length, agreed: items.filter((i) => i.agreed).length, contested: items.filter((i) => i.contested).length, partial: items.filter((i) => i.partial).length, items, shared_hosts: shared };
}
