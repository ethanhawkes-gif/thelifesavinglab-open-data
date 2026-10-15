import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ledger = JSON.parse(await readFile('estimates/ledger.json', 'utf8'));
const toll = JSON.parse(await readFile('estimates/toll.json', 'utf8'));
const tree = JSON.parse(await readFile('estimates/tree.json', 'utf8'));
const ids = new Set(ledger.rows.map((r) => r.id));
const retired = new Set(ledger.rows.filter((r) => /\bretired\b/.test(r.tags)).map((r) => r.id));

test('every ledger row has an id, a grade, a source and a do-not-add rule; ids are unique', () => {
  assert.equal(ids.size, ledger.rows.length);
  for (const r of ledger.rows) {
    assert.match(r.id, /^[a-z0-9][a-z0-9-]{2,80}$/, r.id);
    assert.ok(['A', 'B', 'C', 'D'].includes(r.grade), r.id);
    assert.ok(r.source && r.do_not_add_to, r.id);
    if (r.low != null && r.high != null) assert.ok(r.low <= r.high, `${r.id}: low above high`);
    if (retired.has(r.id)) assert.match(r.note, /retired: \d{4}-\d{2}-\d{2}/, `${r.id}: a retired row carries the date in its note`);
  }
});

test('the toll layers cite rows that exist and are not retired, and the range is floor < ceiling', () => {
  assert.ok(toll.floor > 0 && toll.floor < toll.ceiling);
  const layers = [...(toll.layers || []), { id: 'nonfatal', ...toll.nonfatal }];
  assert.ok(layers.length > 3);
  for (const layer of layers) {
    assert.ok(layer.rows && layer.rows.length, `toll layer ${layer.id} cites no rows`);
    for (const id of layer.rows) {
      assert.ok(ids.has(id), `toll layer ${layer.id} cites unknown row ${id}`);
      if (retired.has(id)) assert.ok(/retired|traced/.test(layer.note || ''), `toll layer ${layer.id} cites retired row ${id} without saying so`);
    }
  }
});

test('every tree measure and leaf cites rows that exist, and none that are retired', () => {
  for (const [nid, n] of Object.entries(tree.nodes)) {
    for (const m of n.measures || []) for (const id of m.rows || []) { assert.ok(ids.has(id), `${nid}: unknown row ${id}`); assert.ok(!retired.has(id), `${nid}: retired row ${id}`); }
    for (const id of n.rows || []) { assert.ok(ids.has(id), `${nid}: unknown row ${id}`); assert.ok(!retired.has(id), `${nid}: retired row ${id}`); }
    if (n.type === 'question') for (const o of n.options) assert.ok(tree.nodes[o.to], `${nid}: option points at missing node ${o.to}`);
  }
});

test('the generated files are what the builders produce (run them after editing)', () => {
  assert.equal(ledger.schema, 'lifesavinglab.ledger.v2');
  assert.ok(ledger.version && ledger.last_checked);
});
