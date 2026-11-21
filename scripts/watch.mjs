#!/usr/bin/env node
// The watch: read public feeds on a schedule, keep the reports that look like a drowning, a search, a capsize or a
// rescue, and queue them for a person to read. Stores no headline text and no names: a report is a link, a source,
// a date, a derived kind and a hash. Zero dependencies. Never fatal on a single source.
//
//   node scripts/watch.mjs            # fetch, filter, dedupe, write watch/queue.json and watch/feed.json
//   node scripts/watch.mjs --dry-run  # same, but print instead of writing
//   node scripts/watch.mjs --from-file fixtures.xml --source test   # offline: parse one file as one source
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectPII } from '../src/lib/pii.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'watch');
const MAX_QUEUE = 1500;      // oldest dismissed/published items fall off first
const FEED_SIZE = 60;        // the public feed is the newest reported items
const FETCH_TIMEOUT_MS = 20000;
const UA = 'lifesavinglab-watch/1.0 (+https://thelifesavinglab.org; reads public feeds hourly; contact hello@thelifesavinglab.org)';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

const sha = (s) => createHash('sha256').update(s).digest('hex');
const now = () => new Date().toISOString();

async function readJSON(p, fallback) { try { return JSON.parse(await readFile(p, 'utf8')); } catch { return fallback; } }

/** Decode the handful of entities feeds use; strip tags and CDATA. */
export function text(s) {
  if (!s) return '';
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/\s+/g, ' ').trim();
}
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1] : '';
}
/** Minimal RSS 2.0 / Atom item extraction. Returns {title, link, published, summary}. */
export function parseFeed(xml) {
  const items = [];
  const rss = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  const atom = rss.length ? [] : [...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)].map((m) => m[1]);
  for (const b of rss) {
    items.push({ title: text(tag(b, 'title')), link: text(tag(b, 'link')) || (b.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i) || ['', ''])[1].trim(),
      published: text(tag(b, 'pubDate')) || text(tag(b, 'dc:date')) || text(tag(b, 'media-date')), summary: text(tag(b, 'description')) });
  }
  for (const b of atom) {
    const href = (b.match(/<link[^>]*href="([^"]+)"/i) || ['', ''])[1];
    items.push({ title: text(tag(b, 'title')), link: href, published: text(tag(b, 'updated')) || text(tag(b, 'published')), summary: text(tag(b, 'summary')) || text(tag(b, 'content')) });
  }
  return items.filter((i) => i.link);
}

/** Classify one item: a kind if it matches, or null. */
export function classify(item, keywords) {
  const hay = `${item.title} ${item.summary}`.toLowerCase();
  if (keywords.exclude.some((x) => hay.includes(x.toLowerCase()))) return null;
  for (const k of keywords.kinds) { if (new RegExp(k.pattern, 'i').test(hay)) return k.kind; }
  return null;
}

/** Normalise a link for deduplication: strip tracking and fragments. */
export function canonical(link) {
  try { const u = new URL(link); u.hash = ''; [...u.searchParams.keys()].forEach((k) => { if (/^utm_|^fbclid|^gclid|^ref$/i.test(k)) u.searchParams.delete(k); }); return u.toString(); }
  catch { return link.trim(); }
}

function toISO(d) { const t = Date.parse(d); return Number.isNaN(t) ? null : new Date(t).toISOString(); }

async function fetchText(url) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try { const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' }, signal: ctrl.signal, redirect: 'follow' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.text(); }
  finally { clearTimeout(t); }
}

export function buildReports(items, source, keywords, seenAt) {
  const out = [];
  for (const it of items) {
    const kind = classify(it, keywords); if (!kind) continue;
    const link = canonical(it.link);
    const id = sha(link).slice(0, 16);
    const pii = detectPII([it.title, it.summary]);
    out.push({ id, link, source: source.id, source_kind: source.kind, region: source.region || null, kind,
      published: toISO(it.published), first_seen: seenAt, stage: 'reported', title_sha256: sha(it.title.toLowerCase()),
      held: pii.length ? pii : null, note: null });
  }
  return out;
}

async function main() {
  const dry = flag('--dry-run');
  const sources = (await readJSON(path.join(DIR, 'sources.json'), { sources: [] })).sources;
  const keywords = await readJSON(path.join(DIR, 'keywords.json'), { kinds: [], exclude: [] });
  const queue = await readJSON(path.join(DIR, 'queue.json'), { schema: 'lifesavinglab.watch.queue.v1', items: [], runs: [] });
  const byId = new Map(queue.items.map((i) => [i.id, i]));
  const run = { at: now(), sources: {}, added: 0 };
  const fromFile = opt('--from-file');
  const targets = fromFile ? [{ id: opt('--source') || 'file', name: 'file', kind: 'test', url: fromFile, enabled: true }] : sources.filter((s) => s.enabled);

  for (const src of targets) {
    try {
      const xml = fromFile ? await readFile(fromFile, 'utf8') : await fetchText(src.url);
      const items = parseFeed(xml);
      const reports = buildReports(items, src, keywords, run.at);
      let added = 0;
      for (const r of reports) {
        if (byId.has(r.id)) continue;
        const dupTitle = [...byId.values()].find((x) => x.title_sha256 === r.title_sha256);
        if (dupTitle) { r.stage = 'matched'; r.note = `same headline as ${dupTitle.id}`; }
        byId.set(r.id, r); added++;
      }
      run.sources[src.id] = { ok: true, items: items.length, matched: reports.length, added };
      run.added += added;
    } catch (e) {
      run.sources[src.id] = { ok: false, error: String(e.message || e).slice(0, 160) };
    }
  }

  // Trim: keep the queue bounded, dropping the oldest items that are no longer waiting on a person.
  let items = [...byId.values()].sort((a, b) => (b.published || b.first_seen).localeCompare(a.published || a.first_seen));
  if (items.length > MAX_QUEUE) {
    const done = new Set(['published', 'dismissed', 'matched']);
    const keep = items.filter((i) => !done.has(i.stage));
    const rest = items.filter((i) => done.has(i.stage)).slice(0, Math.max(0, MAX_QUEUE - keep.length));
    items = [...keep, ...rest].sort((a, b) => (b.published || b.first_seen).localeCompare(a.published || a.first_seen));
  }
  const runs = [run, ...(queue.runs || [])].slice(0, 168);
  const out = { schema: 'lifesavinglab.watch.queue.v1', generated: run.at, counts: countStages(items), items, runs };
  const feed = { schema: 'lifesavinglab.watch.feed.v1', generated: run.at, note: 'Reports found by the watch and not yet read by a person, newest first. A report is not a count. No headline text and no names are stored; follow the link to read it.',
    counts: out.counts, sources: Object.fromEntries(Object.entries(run.sources).map(([k, v]) => [k, v.ok ? 'ok' : 'failed'])),
    items: items.filter((i) => !i.held).slice(0, FEED_SIZE).map((i) => ({ id: i.id, kind: i.kind, source: i.source, source_kind: i.source_kind, region: i.region, published: i.published, first_seen: i.first_seen, stage: i.stage, link: i.link })) };

  if (dry) { console.log(JSON.stringify({ run, counts: out.counts, sample: feed.items.slice(0, 5) }, null, 1)); return; }
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, 'queue.json'), JSON.stringify(out, null, 1) + '\n');
  await writeFile(path.join(DIR, 'feed.json'), JSON.stringify(feed, null, 1) + '\n');
  console.log(`watch: ${run.added} new report(s); ${items.length} in queue; sources: ${Object.entries(run.sources).map(([k, v]) => `${k}=${v.ok ? v.added : 'FAILED'}`).join(' ')}`);
}

export function countStages(items) {
  const c = { reported: 0, read: 0, 'row-written': 0, matched: 0, published: 0, dismissed: 0, held: 0 };
  for (const i of items) { if (i.held) c.held++; c[i.stage] = (c[i.stage] || 0) + 1; }
  return c;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => { console.error('watch failed:', e); process.exit(1); });
}
