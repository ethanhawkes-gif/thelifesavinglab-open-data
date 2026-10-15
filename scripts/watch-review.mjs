#!/usr/bin/env node
// Review the watch queue from the command line. A person reads each report at its link and decides.
//
//   node scripts/watch-review.mjs list [--stage reported] [--kind capsize] [--limit 30]
//   node scripts/watch-review.mjs read <id>                      # mark as read by a person
//   node scripts/watch-review.mjs dismiss <id> --note "not a drowning"
//   node scripts/watch-review.mjs match <id> --with <otherId>    # same event as another report
//   node scripts/watch-review.mjs row <id> --water sea-coast --activity swimming --outcome missing \
//        [--persons 1] [--place "Maui"] [--date 2026-05-09] [--who "Coast Guard"] [--minutes 40] [--confidence medium] [--note "..."]
//        # appends a register row to watch/register.csv (no names, place at town level or coarser) and marks the report row-written
//   node scripts/watch-review.mjs publish <id>                   # the row has been merged into a release
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectPII } from '../src/lib/pii.js';
import { countStages } from './watch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const Q = path.join(ROOT, 'watch', 'queue.json');
const REG = path.join(ROOT, 'watch', 'register.csv');
const COLS = ['event_id', 'date', 'time_local', 'place', 'lat', 'lon', 'water', 'activity', 'vessel_type', 'vessel_length_m', 'persons_involved', 'age_band', 'sex', 'pfd_worn', 'alcohol_suspected', 'water_temp_c', 'air_temp_c', 'wind_sea_state', 'minutes_alarm_to_reach', 'who_responded', 'outcome', 'source', 'confidence', 'notes'];
const WATER = ['sea-coast', 'harbor-river', 'lake', 'pool', 'home', 'flood', 'other'];
const OUTCOME = ['rescued-unharmed', 'rescued-injured', 'non-fatal-drowning', 'fatal', 'missing', 'unknown'];

const [cmd, id, ...rest] = process.argv.slice(2);
const opt = (n, d) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : d; };
const csvq = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

async function load() { return JSON.parse(await readFile(Q, 'utf8')); }
async function save(q) { q.counts = countStages(q.items); await writeFile(Q, JSON.stringify(q, null, 1) + '\n'); }
function find(q) { const it = q.items.find((x) => x.id === id); if (!it) { console.error(`no report ${id}`); process.exit(2); } return it; }
const age = (iso) => iso ? `${Math.round((Date.now() - Date.parse(iso)) / 3600000)}h` : '?';

async function main() {
  const q = await load();
  if (!cmd || cmd === 'list') {
    const stage = opt('--stage'); const kind = opt('--kind'); const limit = Number(opt('--limit', 30));
    const rows = q.items.filter((i) => (!stage || i.stage === stage) && (!kind || i.kind === kind)).slice(0, limit);
    console.log(`queue ${q.generated}: ${JSON.stringify(q.counts)}`);
    for (const i of rows) console.log(`${i.id}  ${i.stage.padEnd(12)} ${i.kind.padEnd(18)} ${i.source.padEnd(12)} ${age(i.published || i.first_seen).padStart(5)}  ${i.held ? 'HELD:' + i.held.join(',') + ' ' : ''}${i.link}`);
    return;
  }
  const it = find(q);
  if (cmd === 'read') { it.stage = 'read'; it.read_at = new Date().toISOString(); }
  else if (cmd === 'dismiss') { it.stage = 'dismissed'; it.note = opt('--note', it.note); }
  else if (cmd === 'match') { it.stage = 'matched'; it.note = `same event as ${opt('--with', '?')}`; }
  else if (cmd === 'publish') { it.stage = 'published'; }
  else if (cmd === 'row') {
    const water = opt('--water'), activity = opt('--activity'), outcome = opt('--outcome');
    if (!WATER.includes(water)) { console.error(`--water must be one of ${WATER.join(', ')}`); process.exit(2); }
    if (!OUTCOME.includes(outcome)) { console.error(`--outcome must be one of ${OUTCOME.join(', ')}`); process.exit(2); }
    if (!activity) { console.error('--activity is required'); process.exit(2); }
    const row = { event_id: `w-${it.id}`, date: opt('--date', (it.published || it.first_seen).slice(0, 10)), time_local: '', place: opt('--place', ''), lat: '', lon: '',
      water, activity, vessel_type: opt('--vessel', ''), vessel_length_m: '', persons_involved: opt('--persons', ''), age_band: opt('--age', ''), sex: '', pfd_worn: opt('--pfd', ''),
      alcohol_suspected: '', water_temp_c: '', air_temp_c: '', wind_sea_state: '', minutes_alarm_to_reach: opt('--minutes', ''), who_responded: opt('--who', ''),
      outcome, source: `${it.source} ${it.link}`, confidence: opt('--confidence', 'medium'), notes: opt('--note', '') };
    const pii = detectPII(row);
    if (pii.length) { console.error(`row refused: looks like it carries ${pii.join(', ')}. Place at town level or coarser; never a name or a precise position.`); process.exit(3); }
    let header = '';
    try { await readFile(REG, 'utf8'); } catch { header = COLS.join(',') + '\n'; }
    await appendFile(REG, header + COLS.map((c) => csvq(row[c])).join(',') + '\n');
    it.stage = 'row-written'; it.row_id = row.event_id;
  }
  else { console.error('unknown command'); process.exit(2); }
  await save(q);
  console.log(`${it.id} → ${it.stage}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
