#!/usr/bin/env node
// One-time import: canon export -> seeds/ledger.json (citation metadata only). Re-runs are deterministic.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseLedger, parseNonAdditive } from './parse-canon.mjs';
import { deriveTier, parseToll } from '../src/lib/tiers.js';

// Held out of the public seed until a human applies safe-messaging review (suicide-adjacent).
export const EXCLUDE = { 'piscataqua-span': 'sensitive topic (bridge/self-harm adjacent); held for human safe-messaging review' };

export function slug(raw) { const s = raw.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''); return s.length <= 60 ? s : s.slice(0, 61).replace(/-[^-]*$/, ''); }

export function buildSeed(md) {
  const ledger = parseLedger(md);
  const sources = new Map();
  const observations = [];
  for (const r of ledger) {
    if (EXCLUDE[r.id]) continue;
    const sid = slug(r.source);
    if (!sources.has(sid)) sources.set(sid, { id: sid, citation: r.source, access_terms: 'unreviewed', license: 'not asserted; facts cited, no text copied' });
    observations.push({ id: r.id, label: r.label, year: r.year, place: r.place, toll: r.toll, cause: r.cause, confidence: r.confidence, tier: deriveTier(r.confidence, r.source), tier_basis: 'tiers-v2', toll_parsed: parseToll(r.toll), source_id: sid });
  }
  const byLabel = new Map(ledger.map((r) => [r.label, r.id]));
  const non_additive = parseNonAdditive(md).map((p) => {
    const a = byLabel.get(p.a_label), b = byLabel.get(p.b_label);
    if (!a || !b) throw new Error(`unresolved pair: ${p.a_label} / ${p.b_label}`);
    return { a_id: a, b_id: b, reason: p.reason };
  });
  return {
    observations: observations.sort((x, y) => x.id.localeCompare(y.id)),
    sources: [...sources.values()].sort((x, y) => x.id.localeCompare(y.id)),
    non_additive,
    excluded: Object.entries(EXCLUDE).map(([id, reason]) => ({ id, reason })),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync('seeds/ledger.json', JSON.stringify(buildSeed(readFileSync(process.argv[2], 'utf8')), null, 2) + '\n');
  console.log('wrote seeds/ledger.json');
}
