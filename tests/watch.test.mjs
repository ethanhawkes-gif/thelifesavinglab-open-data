import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFeed, classify, canonical, buildReports, countStages, text } from '../scripts/watch.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const xml = await readFile(path.join(here, 'fixtures', 'watch-sample.xml'), 'utf8');
const keywords = JSON.parse(await readFile(path.join(here, '..', 'watch', 'keywords.json'), 'utf8'));
const source = { id: 'test', kind: 'test', region: 'nowhere' };

test('parses RSS items with CDATA and tracking links', () => {
  const items = parseFeed(xml);
  assert.equal(items.length, 6);
  assert.equal(items[0].summary, 'The search was suspended after 30 hours.');
  assert.equal(canonical(items[0].link), 'https://example.org/news/1');
});

test('classifies by kind and drops excluded phrases', () => {
  const items = parseFeed(xml);
  assert.equal(classify(items[0], keywords), 'search-suspended');
  assert.equal(classify(items[1], keywords), 'rescue');
  assert.equal(classify(items[2], keywords), null, 'drowning in paperwork is excluded');
  assert.equal(classify(items[3], keywords), null, 'films are excluded');
});

test('stores no headline text and holds reports whose text trips the PII detector', () => {
  const reports = buildReports(parseFeed(xml), source, keywords, '2026-10-13T15:00:00Z');
  for (const r of reports) {
    assert.ok(!('title' in r) && !('summary' in r), 'no headline text stored');
    assert.match(r.title_sha256, /^[a-f0-9]{64}$/);
  }
  const held = reports.find((r) => r.link.endsWith('/5'));
  assert.ok(held.held && held.held.includes('phone'), 'named-person report is held');
  const ok = reports.find((r) => r.link.endsWith('/1'));
  assert.equal(ok.held, null);
});

test('the same headline from two links is matched, not counted twice', () => {
  const reports = buildReports(parseFeed(xml), source, keywords, '2026-10-13T15:00:00Z');
  const a = reports.filter((r) => r.kind === 'rescue' && r.link.includes('/2'));
  assert.equal(a.length, 2);
  assert.equal(a[0].title_sha256, a[1].title_sha256);
  const counts = countStages(reports);
  assert.equal(counts.reported, reports.length);
});

test('text() decodes entities and strips tags', () => {
  assert.equal(text('<![CDATA[A &amp; B <b>c</b>]]>'), 'A & B c');
});
