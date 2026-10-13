#!/usr/bin/env node
// Derive citation METADATA ONLY from a Life-Saving Lab canon export.
// Narrative bodies are never copied. Usage: node scripts/parse-canon.mjs <canon.md> > seeds/ledger.json
import { readFileSync } from 'node:fs';

const FIELDS = { Id: 'id', Year: 'year', Place: 'place', Toll: 'toll', Cause: 'cause', Confidence: 'confidence', Source: 'source' };

/** Parse the "## Ledger" section into metadata rows. */
export function parseLedger(md) {
  const start = md.indexOf('\n## Ledger');
  if (start < 0) throw new Error('no ## Ledger section');
  const end = md.indexOf('\n## ', start + 5);
  const section = md.slice(start, end < 0 ? undefined : end);
  const rows = [];
  for (const block of section.split('\n### ').slice(1)) {
    const lines = block.split('\n');
    const row = { label: lines[0].trim() };
    for (const l of lines) {
      const m = /^- (\w+): (.*)$/.exec(l.trim());
      if (m && FIELDS[m[1]]) row[FIELDS[m[1]]] = m[2].replace(/^`|`$/g, '').trim();
    }
    if (row.id) rows.push(row);
  }
  return rows;
}

/** Parse "## Do not add these" into label pairs with the canon's stated reason. */
export function parseNonAdditive(md) {
  const start = md.indexOf('\n## Do not add these');
  if (start < 0) return [];
  const end = md.indexOf('\n## ', start + 5);
  const out = [];
  for (const l of md.slice(start, end).split('\n')) {
    const m = /^- \*\*(.+?)\*\* \((.+?)\) and \*\*(.+?)\*\* \((.+?)\)\.\s*(.*)$/.exec(l.trim());
    if (m) out.push({ a_label: m[2], a_value: m[1], b_label: m[4], b_value: m[3], reason: m[5] });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const md = readFileSync(process.argv[2], 'utf8');
  process.stdout.write(JSON.stringify({ ledger: parseLedger(md), non_additive: parseNonAdditive(md) }, null, 2) + '\n');
}
