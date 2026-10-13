import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { handle, exportsFor, respond } from '../src/worker.js';
import release from '../src/data/release.json' with { type: 'json' };
import { sha256Hex } from '../src/lib/hash.js';
import { OPENAPI } from '../src/openapi.js';
import { freshDB } from './helpers.mjs';

const TOKEN = 'r'.repeat(48);
const get = (p, env) => handle(new Request('https://api.test' + p), env);
const post = (p, body, env, headers = {}) => handle(new Request('https://api.test' + p, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }), env);
const cite = { title: 'Recreational Boating Statistics 2024', publisher: 'U.S. Coast Guard' };

test('health, status, root, openapi', async () => {
  assert.equal((await get('/v1/health')).status, 200);
  const st = await (await get('/v1/status')).json();
  assert.equal(st.release.version, release.meta.version);
  assert.equal(st.staging, false);
  assert.equal((await (await get('/')).json()).api, '/v1');
  const spec = await (await get('/v1/openapi.json')).json();
  assert.equal(spec.openapi, '3.1.0');
});
test('every OpenAPI path is routed (no 404 on documented GETs)', async () => {
  for (const [p, ops] of Object.entries(OPENAPI.paths)) {
    if (!ops.get || p.includes('{') || p.includes('review')) continue;
    const r = await get(p === '/v1/non-additive/check' ? p + '?ids=titanic' : p);
    assert.equal(r.status, 200, p);
  }
});
test('observations list, filters, single, and 404/400 edges', async () => {
  const all = await (await get('/v1/observations')).json();
  assert.equal(all.data.length, release.observations.length);
  const t4 = await (await get('/v1/observations?tier=T4')).json();
  assert.ok(t4.data.every((o) => o.tier === 'T4') && t4.data.length >= 1);
  assert.equal((await get('/v1/observations?tier=T9')).status, 400);
  const one = await (await get('/v1/observations/cdc-drown-2018')).json();
  assert.ok(one.do_not_combine_with.length >= 3);
  assert.equal((await get('/v1/observations/nope-nope')).status, 404);
  assert.equal((await get('/v1/observations/..%2F..%2Fetc')).status, 404);
});
test('non-additive check flags canon pairs and passes compatible sets', async () => {
  const bad = await (await get('/v1/non-additive/check?ids=mediterranean,iom-all')).json();
  assert.equal(bad.combinable, false);
  const ok = await (await get('/v1/non-additive/check?ids=titanic,empress')).json();
  assert.equal(ok.combinable, true);
  assert.equal((await get('/v1/non-additive/check?ids=')).status, 400);
  assert.equal((await get('/v1/non-additive/check?ids=' + Array(51).fill('ab').join(','))).status, 400);
});
test('exports are byte-identical across calls and match manifest hashes', async () => {
  const j1 = await (await get('/v1/export.json')).text();
  const j2 = await (await get('/v1/export.json')).text();
  assert.equal(j1, j2);
  assert.equal(await sha256Hex(j1), release.manifest.sha256['export.json']);
  const c = await get('/v1/export.csv');
  assert.equal(c.headers.get('x-sha256'), await sha256Hex(await c.text()));
  assert.equal(exportsFor(release).manifest.version, release.meta.version);
});
test('contribution: clean -> staged, audit row written, duplicate is idempotent', async () => {
  const { db, d1 } = freshDB({ seed: true });
  const body = { kind: 'correction', target_id: 'titanic', field: 'toll', proposed: '1,496–1,517', citation: cite };
  const r = await post('/v1/contributions', body, { DB: d1 });
  assert.equal(r.status, 202);
  const j = await r.json();
  assert.equal(j.status, 'staged');
  const again = await (await post('/v1/contributions', body, { DB: d1 })).json();
  assert.equal(again.duplicate, true);
  assert.equal(db.prepare('SELECT count(*) n FROM audit_events').get().n, 1);
  assert.equal(db.prepare("SELECT toll FROM observations WHERE id='titanic'").get().toll, '1,496–1,517', 'canonical row untouched');
});
test('contribution edges: PII quarantined, invalid rejected, size/type/method enforced, no DB = 503', async () => {
  const { d1 } = freshDB({ seed: true });
  const q = await (await post('/v1/contributions', { kind: 'correction', target_id: 'titanic', field: 'place', proposed: 'ring 603-555-0142', citation: cite }, { DB: d1 })).json();
  assert.equal(q.status, 'quarantined');
  assert.equal((await post('/v1/contributions', { kind: 'x' }, { DB: d1 })).status, 400);
  assert.equal((await post('/v1/contributions', '{not json', { DB: d1 })).status, 400);
  assert.equal((await post('/v1/contributions', { kind: 'correction', pad: 'x'.repeat(9000) }, { DB: d1 })).status, 413);
  assert.equal((await post('/v1/contributions', 'a=b', { DB: d1 }, { 'content-type': 'application/x-www-form-urlencoded' })).status, 415);
  assert.equal((await get('/v1/contributions', { DB: d1 })).status, 405);
  assert.equal((await post('/v1/contributions', { kind: 'correction' }, {})).status, 503);
});
test('review workflow: token required, decision recorded once, canonical data never edited', async () => {
  const { db, d1 } = freshDB({ seed: true });
  const env = { DB: d1, REVIEW_TOKEN: TOKEN };
  const { id } = await (await post('/v1/contributions', { kind: 'source_metadata', target_id: 'titanic', citation: cite }, env)).json();
  assert.equal((await get('/v1/review/queue', env)).status, 401);
  const auth = { authorization: 'Bearer ' + TOKEN };
  const queue = await (await handle(new Request('https://api.test/v1/review/queue', { headers: auth }), env)).json();
  assert.equal(queue.data.length, 1);
  assert.ok(queue.data[0].payload.includes('titanic'), 'reviewer sees the payload');
  assert.equal((await post('/v1/review/queue', {}, env, auth)).status, 405);
  assert.equal((await handle(new Request('https://api.test/v1/review/' + id, { headers: auth }), env)).status, 405);
  assert.equal((await post('/v1/review/' + id, { decision: 'accepted' }, env, { authorization: 'Bearer wrong' })).status, 401);
  assert.equal((await post('/v1/review/' + id, { decision: 'merge-now' }, env, auth)).status, 400);
  assert.equal((await post('/v1/review/' + id, { decision: 'accepted' }, env, auth)).status, 200);
  assert.equal((await post('/v1/review/' + id, { decision: 'declined' }, env, auth)).status, 404, 'decided once');
  assert.deepEqual(db.prepare('SELECT actor_role, action FROM audit_events ORDER BY seq').all().map((r) => r.actor_role + ':' + r.action), ['public:contribution.staged', 'reviewer:contribution.accepted']);
  const short = { DB: d1, REVIEW_TOKEN: 'short' };
  assert.equal((await handle(new Request('https://api.test/v1/review/queue', { headers: { authorization: 'Bearer short' } }), short)).status, 401, 'weak token refused');
});
test('pending-queue cap returns 429 instead of growing storage', async () => {
  const { d1 } = freshDB({ seed: true });
  const env = { DB: d1, MAX_PENDING: 1 };
  assert.equal((await post('/v1/contributions', { kind: 'source_metadata', target_id: 'titanic', citation: cite }, env)).status, 202);
  assert.equal((await post('/v1/contributions', { kind: 'source_metadata', target_id: 'empress', citation: cite }, env)).status, 429);
});
test('distress submission stores nothing and returns emergency numbers', async () => {
  const { db, d1 } = freshDB({ seed: true });
  const r = await post('/v1/contributions', { kind: 'correction', proposed: 'mayday we are sinking' }, { DB: d1 });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.status, 'not-received');
  assert.match(j.emergency, /VHF channel 16/);
  assert.match(j.emergency, /988/);
  assert.equal(db.prepare('SELECT count(*) n FROM contributions').get().n, 0);
  const bad = await (await post('/v1/contributions', 'help, man overboard', { DB: d1 })).json();
  assert.equal(bad.status, 'not-received', 'even non-JSON distress gets the redirect');
});
test('security smoke: headers, unknown routes, methods, CORS preflight, 500 hides detail', async () => {
  const r = await get('/v1/health');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.match(r.headers.get('content-security-policy'), /default-src 'none'/);
  assert.match(r.headers.get('x-not-a-rescue-service'), /988/);
  assert.equal((await get('/admin')).status, 404);
  assert.equal((await handle(new Request('https://api.test/v1/sources', { method: 'DELETE' }))).status, 405);
  assert.equal((await handle(new Request('https://api.test/v1/sources', { method: 'OPTIONS' }))).status, 204);
  const boom = await worker.fetch({ get url() { throw new Error('secret detail'); } }, {});
  assert.equal(boom.status, 500);
  assert.ok(!(await boom.text()).includes('secret'));
  assert.equal(respond('x', 404).headers.get('cache-control'), 'no-store');
});
