import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../src/lib/minischema.js';
import { buildPrompt, checkBundle, leaseState, makeReceipt, agreement, MAX_QUOTE_WORDS } from '../scripts/tasks.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const schema = JSON.parse(await readFile(path.join(root, 'tasks', 'bundle.schema.json'), 'utf8'));
const board = JSON.parse(await readFile(path.join(root, 'tasks', 'tasks.json'), 'utf8'));
const ledgerIds = new Set(JSON.parse(await readFile(path.join(root, 'estimates', 'ledger.json'), 'utf8')).rows.map((r) => r.id));
const sample = JSON.parse(await readFile(path.join(here, 'fixtures', 'bundle-sample.json'), 'utf8'));
const ctx = { schema, tasks: board.tasks, ledgerIds, preambleVersion: board.preamble_version };
const clone = () => JSON.parse(JSON.stringify(sample));

test('the board is well formed and every task row points at a ledger row', () => {
  assert.ok(board.tasks.length >= 10);
  for (const t of board.tasks) {
    assert.match(t.id, /^[a-z0-9][a-z0-9-]{2,80}$/);
    for (const r of t.rows) assert.ok(ledgerIds.has(r), `${t.id} refers to unknown row ${r}`);
    assert.ok(t.accept.length >= 1 && t.inputs.length >= 1);
  }
  assert.equal(new Set(board.tasks.map((t) => t.id)).size, board.tasks.length);
  assert.match(board.preamble, /Never invent/);
});

test('minischema reports type, enum, pattern, length and unexpected fields', () => {
  const s = { type: 'object', additionalProperties: false, required: ['a'], properties: { a: { enum: ['x', 'y'] }, b: { type: ['integer', 'null'] }, c: { type: 'string', maxLength: 3, pattern: '^[a-z]+$' } } };
  assert.deepEqual(validate(s, { a: 'x', b: null, c: 'ab' }), []);
  const probs = validate(s, { a: 'z', b: 1.5, c: 'ABCD', d: 1 }).map((p) => p.path);
  assert.deepEqual(probs.sort(), ['$.a', '$.b', '$.c', '$.c', '$.d']);
  assert.equal(validate(s, {})[0].message, 'missing "a"');
});

test('the prompt pack carries the preamble, the task and the acceptance checks', () => {
  const t = board.tasks.find((x) => x.id === 'nonfatal-ratio-primary');
  const p = buildPrompt(t, board.preamble);
  assert.match(p, /Never invent/);
  assert.match(p, /## Task nonfatal-ratio-primary/);
  assert.match(p, /who-nonfatal/);
  assert.match(p, /"task_id" to "nonfatal-ratio-primary"/);
  assert.doesNotMatch(p, /<!--/);
});

test('a clean bundle passes the machine checks', () => {
  const r = checkBundle(sample, ctx);
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
});

test('schema problems block before anything else runs', () => {
  const b = clone(); b.status = 'maybe'; b.extra = 1;
  const r = checkBundle(b, ctx);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.startsWith('$.status')));
  assert.ok(r.errors.some((e) => e.startsWith('$.extra')));
});

test('personal data, press domains at grade A, long quotes and unknown rows are errors', () => {
  const b = clone();
  b.notes = 'victim: J. Doe, call 555-123-4567';
  b.rows.push({ id: 'new-row-test', figure: '12', low: 12, high: 12, unit: 'deaths', year: 2025, scope: 'test', geography: 'nowhere', source: 'a paper', url: 'https://www.bbc.co.uk/news/x', grade: 'A', do_not_add_to: 'nothing', note: '' });
  b.corrections.push({ row_id: 'no-such-row', field: 'figure', old: '1', new: '2', evidence: 'x' });
  b.evidence[0].quote = Array.from({ length: MAX_QUOTE_WORDS + 1 }, (_, i) => 'w' + i).join(' ');
  const r = checkBundle(b, ctx);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /personal data/.test(e)));
  assert.ok(r.errors.some((e) => /bbc\.co\.uk/.test(e)));
  assert.ok(r.errors.some((e) => /no-such-row/.test(e)));
  assert.ok(r.errors.some((e) => /quote is 26 words/.test(e)));
});

test('a row that equals the sum of two others is flagged; an existing id must be a correction', () => {
  const b = clone();
  const row = (id, n) => ({ id, figure: String(n), low: n, high: n, unit: 'deaths', year: 2024, scope: 's', geography: 'g', source: 'National statistics office', url: 'https://stats.example.gov/table1', grade: 'A', do_not_add_to: 'anything', note: '' });
  b.rows.push(row('part-a', 100), row('part-b', 250), row('whole', 350), row('who-nonfatal', 4));
  b.evidence.push({ url: 'https://stats.example.gov/table1', quote: 'short', where: 'table 1' });
  const r = checkBundle(b, ctx);
  assert.ok(r.warnings.some((w) => /"whole" equals "part-a" \+ "part-b"/.test(w)));
  assert.ok(r.errors.some((e) => /"who-nonfatal" already exists/.test(e)));
});

test('status rules: done needs content and evidence, not-found needs what was tried', () => {
  const a = clone(); a.corrections = []; a.rows = [];
  assert.ok(checkBundle(a, ctx).errors.some((e) => /no rows and no corrections/.test(e)));
  const n = clone(); n.status = 'not-found'; n.tried = [];
  assert.ok(checkBundle(n, ctx).errors.some((e) => /what was tried/.test(e)));
  n.tried = ['searched the WHO site'];
  assert.equal(checkBundle(n, ctx).ok, true);
});

test('leases lapse after their date', () => {
  const now = Date.parse('2026-10-20T00:00:00Z');
  assert.equal(leaseState({ status: 'open' }, now), 'open');
  assert.equal(leaseState({ status: 'claimed', claimed_by: 'x', claimed_until: '2026-10-25T00:00:00Z' }, now), 'claimed');
  assert.equal(leaseState({ status: 'claimed', claimed_by: 'x', claimed_until: '2026-10-19T00:00:00Z' }, now), 'open');
  assert.equal(leaseState({ status: 'done', claimed_by: 'x', claimed_until: '2026-10-25T00:00:00Z' }, now), 'done');
});

test('a receipt hashes the bundle deterministically and records what changed', async () => {
  const r1 = await makeReceipt(sample, { reviewer: 'rev', decision: 'accepted', now: new Date('2026-10-15T00:00:00Z') });
  const reordered = Object.fromEntries(Object.entries(clone()).reverse());
  const r2 = await makeReceipt(reordered, { reviewer: 'rev', decision: 'accepted' });
  assert.equal(r1.bundle_sha256, r2.bundle_sha256);
  assert.equal(r1.id, 'rcpt-' + r1.bundle_sha256.slice(0, 10));
  assert.deepEqual(r1.changed, { rows: 0, corrections: 1, evidence: 1, next_tasks: 1 });
  assert.equal(r1.handle, 'example-handle');
  assert.equal(r1.reviewed, '2026-10-15T00:00:00.000Z');
});

test('two bundles on one task: agreement, contest and single coverage are told apart', () => {
  const a = clone(); a.contributor = { handle: 'one', agent: 'agent-a' };
  a.corrections = [{ row_id: 'who-nonfatal', field: 'grade', old: 'C', new: 'A', evidence: 'x' }, { row_id: 'who-nonfatal', field: 'figure', old: '4–5', new: '4 to 5 per death', evidence: 'x' }];
  const b = clone(); b.contributor = { handle: 'two', agent: 'agent-b' };
  b.corrections = [{ row_id: 'who-nonfatal', field: 'grade', old: 'C', new: 'A', evidence: 'y' }, { row_id: 'who-nonfatal', field: 'figure', old: '4–5', new: '2 per death', evidence: 'y' }, { row_id: 'who-nonfatal', field: 'year', old: '2024', new: '2021', evidence: 'y' }];
  const r = agreement([a, b]);
  assert.equal(r.bundles, 2);
  assert.equal(r.agreed, 1);
  assert.equal(r.contested, 1);
  assert.equal(r.partial, 1);
  assert.deepEqual(r.shared_hosts, ['who.int']);
  const grade = r.items.find((i) => i.field === 'grade');
  assert.deepEqual(grade.values[0].by, ['one', 'two']);
});
