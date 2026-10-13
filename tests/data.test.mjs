import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshDB } from './helpers.mjs';
import { buildRelease } from '../scripts/build-release.mjs';
import { releaseToSQL, q } from '../scripts/release-to-sql.mjs';
import { parseLedger, parseNonAdditive } from '../scripts/parse-canon.mjs';
import { buildSeed, slug } from '../scripts/import-canon.mjs';
import { sha256Hex } from '../src/lib/hash.js';
import { detectPII } from '../src/lib/pii.js';

const seed = JSON.parse(readFileSync('seeds/ledger.json', 'utf8'));
const meta = JSON.parse(readFileSync('seeds/release-meta.json', 'utf8'));
const release = JSON.parse(readFileSync('src/data/release.json', 'utf8'));

test('migrations apply cleanly and seed.sql loads with foreign keys on', () => {
  const { db } = freshDB({ seed: true });
  assert.equal(db.prepare('SELECT count(*) n FROM observations').get().n, release.observations.length);
  assert.equal(db.prepare('SELECT count(*) n FROM non_additive_pairs').get().n, release.non_additive.length);
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
});
test('schema edge: CHECK constraints reject bad confidence, bad tier, self-pairs, http urls', () => {
  const { db } = freshDB({ seed: true });
  assert.throws(() => db.exec("UPDATE observations SET confidence='guess' WHERE id='titanic'"));
  assert.throws(() => db.exec("UPDATE observations SET tier='T9' WHERE id='titanic'"));
  assert.throws(() => db.exec("INSERT INTO non_additive_pairs VALUES ('titanic','titanic','x')"));
  assert.throws(() => db.exec("UPDATE sources SET url='http://x' WHERE rowid=1"));
});
test('audit_events is append-only', () => {
  const { db } = freshDB();
  db.exec("INSERT INTO audit_events (at,actor_role,action,target) VALUES ('t','public','x','y')");
  assert.throws(() => db.exec("UPDATE audit_events SET action='z'"), /append-only/);
  assert.throws(() => db.exec('DELETE FROM audit_events'), /append-only/);
  assert.throws(() => db.exec("INSERT INTO audit_events (at,actor_role,action,target) VALUES ('t','alice','x','y')"));
});
test('release build is deterministic and hashes match the committed manifest', async () => {
  const a = await buildRelease(seed, meta);
  const b = await buildRelease(structuredClone(seed), structuredClone(meta));
  assert.equal(a.json, b.json);
  assert.equal(a.csv, b.csv);
  assert.deepEqual(a.manifest, release.manifest);
  assert.equal(await sha256Hex(readFileSync('dist/export.json', 'utf8')), release.manifest.sha256['export.json']);
  assert.equal(await sha256Hex(readFileSync('dist/export.csv', 'utf8')), release.manifest.sha256['export.csv']);
});
test('release build edge: dangling pair or missing source fails closed', async () => {
  const bad = structuredClone(seed); bad.non_additive.push({ a_id: 'titanic', b_id: 'ghost', reason: 'x' });
  await assert.rejects(() => buildRelease(bad, meta), /unknown id/);
  const bad2 = structuredClone(seed); bad2.observations[0].source_id = 'ghost';
  await assert.rejects(() => buildRelease(bad2, meta), /no source/);
});
test('seed.sql is reproducible from release.json', () => {
  assert.equal(releaseToSQL(release), readFileSync('seeds/seed.sql', 'utf8'));
  assert.equal(q("O'Brien"), "'O''Brien'");
  assert.equal(q(null), 'NULL');
});
test('every observation has a source, a tier and a structured toll; every pair resolves', () => {
  const ids = new Set(release.observations.map((o) => o.id));
  const srcs = new Set(release.sources.map((s) => s.id));
  for (const o of release.observations) { assert.ok(srcs.has(o.source_id), o.id); assert.match(o.tier, /^T[1-4]$/); assert.ok(o.toll_parsed?.kind, o.id); }
  for (const p of release.non_additive) { assert.ok(ids.has(p.a_id) && ids.has(p.b_id)); }
});
test('public release carries no PII and no narrative bodies; sensitive entries held out', () => {
  assert.deepEqual(detectPII(release), []);
  for (const o of release.observations) for (const v of Object.values(o)) if (typeof v === 'string') assert.ok(v.length <= 200, `${o.id} field too long: possible copied text`);
  assert.ok(!release.observations.some((o) => o.id === 'piscataqua-span'));
  assert.deepEqual(release.excluded.map((e) => e.id), ['piscataqua-span']);
});
const MD = '# x\n\n## Ledger\n\n### Ship A\n\n- Id: `a`\n- Year: 1900\n- Place: Sea\n- Toll: 10\n- Cause: weather\n- Confidence: counted\n- Source: Board of inquiry\n\nBody text that must not be copied.\n\n### Ship B\n\n- Id: `b`\n- Year: 1901\n- Place: Sea\n- Toll: ~20\n- Cause: war\n- Confidence: estimated\n- Source: Later estimates\n\n## Do not add these\n\n- **10** (Ship A) and **~20** (Ship B). Different years.\n\n## Tree\n';
test('canon parser extracts metadata, pairs and never the body', () => {
  const rows = parseLedger(MD);
  assert.deepEqual(rows.map((r) => r.id), ['a', 'b']);
  assert.ok(!JSON.stringify(rows).includes('Body text'));
  assert.deepEqual(parseNonAdditive(MD), [{ a_label: 'Ship A', a_value: '10', b_label: 'Ship B', b_value: '~20', reason: 'Different years.' }]);
  const s = buildSeed(MD);
  assert.deepEqual(s.non_additive, [{ a_id: 'a', b_id: 'b', reason: 'Different years.' }]);
  assert.equal(s.observations.find((o) => o.id === 'a').tier, 'T1');
});
test('canon parser edge: missing ledger throws; unresolved pair throws; slug is stable', () => {
  assert.throws(() => parseLedger('# nothing'), /Ledger/);
  assert.deepEqual(parseNonAdditive('# none'), []);
  assert.throws(() => buildSeed(MD.replace('(Ship B)', '(Ship Z)')), /unresolved pair/);
  assert.equal(slug('WHO, Global status report — 2024!'), 'who-global-status-report-2024');
  const long = slug('Peterson et al., Injury Prevention, 2025, doi:10.1136/ip-2024-045597 and more words here');
  assert.ok(long.length <= 60 && !long.endsWith('-'));
});
