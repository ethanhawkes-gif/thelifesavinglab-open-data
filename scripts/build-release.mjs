#!/usr/bin/env node
// seeds/ -> src/data/release.json + dist/{export.json,export.csv,manifest.json}. No clock reads: deterministic.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { canonicalJSON, sha256Hex } from '../src/lib/hash.js';
import { toCSV } from '../src/lib/export.js';

export async function buildRelease(seed, meta) {
  const srcById = new Map(seed.sources.map((s) => [s.id, s]));
  const observations = seed.observations.map((o) => ({ ...o, source_citation: srcById.get(o.source_id)?.citation ?? null }));
  for (const o of observations) if (!o.source_citation) throw new Error(`observation ${o.id} has no source`);
  const ids = new Set(observations.map((o) => o.id));
  for (const p of seed.non_additive) if (!ids.has(p.a_id) || !ids.has(p.b_id)) throw new Error(`pair references unknown id: ${p.a_id}/${p.b_id}`);
  const data = { meta, observations, sources: seed.sources, non_additive: seed.non_additive, excluded: seed.excluded ?? [] };
  const json = canonicalJSON(data);
  const csv = toCSV(observations);
  const manifest = { dataset_id: meta.dataset_id, version: meta.version, released: meta.released, counts: { observations: observations.length, sources: seed.sources.length, non_additive: seed.non_additive.length, excluded: (seed.excluded ?? []).length }, sha256: { 'export.json': await sha256Hex(json), 'export.csv': await sha256Hex(csv) } };
  return { data, json, csv, manifest };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await buildRelease(JSON.parse(readFileSync('seeds/ledger.json', 'utf8')), JSON.parse(readFileSync('seeds/release-meta.json', 'utf8')));
  mkdirSync('dist', { recursive: true });
  writeFileSync('dist/export.json', r.json);
  writeFileSync('dist/export.csv', r.csv);
  writeFileSync('dist/manifest.json', JSON.stringify(r.manifest, null, 2) + '\n');
  writeFileSync('src/data/release.json', JSON.stringify({ ...r.data, manifest: r.manifest }) + '\n');
  console.log(JSON.stringify(r.manifest));
}
