import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/worker.js';
import { makeReceipt } from '../src/lib/bundles.js';
import { freshDB } from './helpers.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const sample = JSON.parse(await readFile(path.join(here, 'fixtures', 'bundle-sample.json'), 'utf8'));
const TOKEN = 't'.repeat(48);
const get = (p, env, headers = {}) => handle(new Request('https://api.test' + p, { headers }), env);
const post = (p, body, env, headers = {}) => handle(new Request('https://api.test' + p, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }), env);
const clone = () => JSON.parse(JSON.stringify(sample));

test('the board is served: open tasks by default, every task with a state', async () => {
  const r = await get('/v1/tasks'); assert.equal(r.status, 200);
  const b = await r.json();
  assert.ok(b.data.length >= 10);
  for (const t of b.data) { assert.equal(t.state, 'open'); assert.ok(t.accept.length); }
  const all = await (await get('/v1/tasks?all=1')).json();
  assert.ok(all.data.length >= b.data.length);
  assert.equal(b.preamble_version, all.preamble_version);
});

test('one task, and its prompt pack as text', async () => {
  const t = await (await get('/v1/tasks/nonfatal-ratio-primary')).json();
  assert.equal(t.id, 'nonfatal-ratio-primary');
  const p = await get('/v1/tasks/nonfatal-ratio-primary/prompt');
  assert.equal(p.status, 200);
  assert.match(p.headers.get('content-type'), /text\/plain/);
  const text = await p.text();
  assert.match(text, /Never invent/);
  assert.match(text, /"task_id" to "nonfatal-ratio-primary"/);
  assert.equal((await get('/v1/tasks/no-such-task')).status, 404);
  assert.equal((await get('/v1/tasks/no-such-task/prompt')).status, 404);
});

test('bundles need the staging store', async () => {
  assert.equal((await post('/v1/bundles', sample, {})).status, 503);
});

test('a clean bundle is staged with a provisional receipt that matches the CLI receipt id', async () => {
  const { db, d1 } = freshDB(); const env = { DB: d1 };
  const r = await post('/v1/bundles', sample, env);
  assert.equal(r.status, 202);
  const b = await r.json();
  assert.match(b.id, /^b-[0-9a-f]{24}$/);
  const receipt = await makeReceipt(sample, { reviewer: 'x', decision: 'accepted' });
  assert.equal(b.provisional_receipt, receipt.id);
  assert.equal(b.bundle_sha256, receipt.bundle_sha256);
  assert.equal(b.duplicate, false);
  const again = await (await post('/v1/bundles', sample, env)).json();
  assert.equal(again.duplicate, true);
  const n = db.prepare('SELECT count(*) AS n FROM bundles').get();
  assert.equal(n.n, 1);
});

test('a bundle with personal data or a schema problem is refused and never stored', async () => {
  const { db, d1 } = freshDB(); const env = { DB: d1 };
  const pii = clone(); pii.notes = 'victim: J Doe 555-123-4567';
  const r1 = await post('/v1/bundles', pii, env);
  assert.equal(r1.status, 400);
  assert.ok((await r1.json()).details.some((d) => /personal data/.test(d)));
  const bad = clone(); bad.status = 'maybe';
  const r2 = await post('/v1/bundles', bad, env);
  assert.equal(r2.status, 400);
  assert.ok((await r2.json()).details.some((d) => /status/.test(d)));
  assert.equal((await post('/v1/bundles', 'not json', env)).status, 400);
  const n = db.prepare('SELECT count(*) AS n FROM bundles').get();
  assert.equal(n.n, 0);
});

test('a bundle that looks like a distress message is not stored and gets the emergency notice', async () => {
  const { d1 } = freshDB(); const env = { DB: d1 };
  const d = clone(); d.notes = 'mayday we are taking on water';
  const r = await post('/v1/bundles', d, env);
  assert.equal(r.status, 200);
  const b = await r.json();
  assert.equal(b.status, 'not-received');
  assert.match(b.emergency, /VHF/);
});

test('reviewers list staged bundles and decide once', async () => {
  const { d1 } = freshDB(); const env = { DB: d1, REVIEW_TOKEN: TOKEN };
  const { id } = await (await post('/v1/bundles', sample, env)).json();
  assert.equal((await get('/v1/review/bundles', env)).status, 401);
  const q = await (await get('/v1/review/bundles', env, { authorization: 'Bearer ' + TOKEN })).json();
  assert.equal(q.data.length, 1);
  assert.equal(q.data[0].id, id);
  assert.equal(JSON.parse(q.data[0].payload).task_id, sample.task_id);
  const bad = await post('/v1/review/bundles/' + id, { decision: 'maybe' }, env, { authorization: 'Bearer ' + TOKEN });
  assert.equal(bad.status, 400);
  const ok = await post('/v1/review/bundles/' + id, { decision: 'accepted', receipt_id: 'rcpt-0123456789' }, env, { authorization: 'Bearer ' + TOKEN });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).receipt_id, 'rcpt-0123456789');
  const twice = await post('/v1/review/bundles/' + id, { decision: 'declined' }, env, { authorization: 'Bearer ' + TOKEN });
  assert.equal(twice.status, 404);
  const left = await (await get('/v1/review/bundles', env, { authorization: 'Bearer ' + TOKEN })).json();
  assert.equal(left.data.length, 0);
});
