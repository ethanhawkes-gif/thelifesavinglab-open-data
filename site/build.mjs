#!/usr/bin/env node
// Builds the static site into site/dist: wraps src/index.html in a document, copies the assets, and pulls the data
// from the repository's own folders (estimates/, tasks/, receipts/, watch/) so the site never carries a second copy.
//   node site/build.mjs            # writes site/dist
//   npx serve site/dist            # or: python3 -m http.server -d site/dist 8080
import { cp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.join(HERE, 'src');
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(HERE, 'dist');

const DATA = [
  ['estimates/ledger.json', 'data/ledger.json'], ['estimates/ledger.csv', 'data/ledger.csv'], ['estimates/toll.json', 'data/toll.json'],
  ['estimates/tree.json', 'data/tree.json'], ['estimates/README.md', 'data/schema.md'], ['estimates/register-template.csv', 'data/register-template.csv'],
  ['tasks/tasks.json', 'data/tasks.json'], ['tasks/bundle.schema.json', 'data/bundle.schema.json'],
  ['receipts/lend.json', 'data/receipts.json'], ['watch/feed.json', 'data/watch-feed.json'],
];

const ORIGIN = 'https://thelifesavinglab.org';
const DESC = 'The Life-Saving Lab: an open ledger of how many people drown, where the counting fails, and what has been shown to change it. A teaching and research project on Portsmouth Harbor.';
const escAttr = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const head = (title, description, pathname) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${escAttr(title)}</title>
<meta name="description" content="${escAttr(description)}">
<meta name="theme-color" content="#10232A">
<link rel="canonical" href="${ORIGIN}${pathname}">
<meta property="og:type" content="website"><meta property="og:site_name" content="The Life-Saving Lab"><meta property="og:title" content="${escAttr(title)}"><meta property="og:description" content="${escAttr(description)}"><meta property="og:url" content="${ORIGIN}${pathname}"><meta property="og:image" content="${ORIGIN}/img/hero_station.jpg"><meta property="og:image:alt" content="Wood Island Life-Saving Station in Kittery, Maine, seen down its boardwalk">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 34 34'%3E%3Ccircle cx='17' cy='17' r='11.5' fill='none' stroke='%23fff' stroke-width='7'/%3E%3Ccircle cx='17' cy='17' r='11.5' fill='none' stroke='%23C4402B' stroke-width='7' stroke-dasharray='9.03 9.03' transform='rotate(-22 17 17)'/%3E%3C/svg%3E">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>
`;
const HEAD = head('The Life-Saving Lab', DESC, '/');
const FOOT = `
</body></html>
`;
/** The source links to its own pages by full address so the prototype artifact can reach them; the built site is host-agnostic. */
const local = (html) => html.replace(/href="https:\/\/thelifesavinglab\.org\//g, 'href="/');

/** The data's own history: every commit that touched the estimates, the board or the receipts, newest first. Empty when git is absent. */
function changelog() {
  try {
    const raw = execFileSync('git', ['log', '--date=short', '--format=%ad%x1f%h%x1f%s', '-n', '60', '--', 'estimates', 'tasks/tasks.json', 'receipts/lend.json', 'watch/sources.json'], { cwd: ROOT, encoding: 'utf8' });
    const entries = raw.trim().split('\n').filter(Boolean).map((l) => { const [date, sha, subject] = l.split('\x1f'); return { date, sha, subject }; });
    return { schema: 'lifesavinglab.changelog.v1', generated: new Date().toISOString(), entries };
  } catch { return { schema: 'lifesavinglab.changelog.v1', generated: new Date().toISOString(), entries: [] }; }
}

/** A small Markdown-to-HTML converter for the briefs: headings, paragraphs, lists, tables, bold, italics, links, blockquotes. */
function markdown(md) {
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/`(.+?)`/g, '<span class="mono">$1</span>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>').replace(/\b((?:https?:\/\/|github\.com\/)[^\s<]+)/g, (m) => `<a href="${m.startsWith('http') ? m : 'https://' + m}">${m}</a>`);
  const lines = md.replace(/\r/g, '').split('\n'); const out = []; let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (/^#{1,3} /.test(l)) { const n = l.match(/^#+/)[0].length; out.push(`<h${n + 1} class="${n === 1 ? 'display h2' : n === 2 ? 'h3' : 'h4'}">${inline(l.slice(n + 1))}</h${n + 1}>`); i++; continue; }
    if (/^> /.test(l)) { out.push(`<blockquote class="quote">${inline(l.slice(2))}</blockquote>`); i++; continue; }
    if (/^\|/.test(l)) { const rows = []; while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]); const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]); const body = rows.slice(2).map(cells);
      out.push(`<div class="tscroll"><table class="data"><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue; }
    if (/^(-|\d+\.) /.test(l)) { const ordered = /^\d/.test(l); const items = []; while (i < lines.length && /^(-|\d+\.) /.test(lines[i])) { let item = lines[i].replace(/^(-|\d+\.) /, ''); i++; while (i < lines.length && /^\s{2,}\S/.test(lines[i])) item += ' ' + lines[i++].trim(); items.push(item); }
      out.push(`<${ordered ? 'ol' : 'ul'} class="small" style="font-size:16px;padding-left:22px;display:flex;flex-direction:column;gap:8px">${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`); continue; }
    const para = []; while (i < lines.length && lines[i].trim() && !/^(#{1,3} |> |\||- |\d+\. )/.test(lines[i])) para.push(lines[i++].trim());
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

async function briefs() {
  const dir = path.join(ROOT, 'docs', 'briefs'); const { readdir } = await import('node:fs/promises');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md') && f !== 'README.md').sort();
  const items = [];
  for (const f of files) {
    const md = await readFile(path.join(dir, f), 'utf8');
    const title = (md.match(/^# (.+)$/m) || ['', f])[1];
    items.push({ id: f.replace(/\.md$/, ''), title, html: markdown(md.replace(/^# .+\n/, '')), source: `docs/briefs/${f}` });
  }
  return { schema: 'lifesavinglab.briefs.v1', generated: new Date().toISOString(), items };
}

/** The static pages under site/src/pages: each fragment is wrapped in the app's own chrome (safety strip, masthead, footer),
 *  with the hash links made absolute so they still reach the app from /history/ or /bridge/, and served at /<name>/. */
async function staticPages(body) {
  const chromeTop = body.slice(0, body.indexOf('<main')).replace(/href="#/g, 'href="/#');
  const chromeBottom = body.slice(body.indexOf('</main>') + '</main>'.length).replace(/href="#/g, 'href="/#')
    .replace(/<script src="(charts|extra|register|lend|pilots|harbor|briefs|app)\.js"><\/script>\n?/g, '')
    .replace('</footer>', '</footer>\n<script src="/charts.js"></script><script src="/extra.js"></script><script src="/static.js"></script>');
  const abs = (s) => s.replace(/(href|src)="(site\.css|charts\.js|extra\.js|static\.js|llms\.txt)"/g, '$1="/$2"').replace(/href="(?!https?:|\/|#|mailto:)/g, 'href="/');
  const dir = path.join(SRC, 'pages'); const names = [];
  for (const f of (await readdir(dir)).filter((n) => n.endsWith('.html')).sort()) {
    const frag = await readFile(path.join(dir, f), 'utf8'); const name = f.replace(/\.html$/, '');
    const title = (frag.match(/<!-- title: (.*?) -->/) || [])[1] || 'The Life-Saving Lab';
    const description = (frag.match(/<!-- description: (.*?) -->/) || [])[1] || DESC;
    const page = head(title, description, `/${name}/`) + local(abs(chromeTop) + `<main id="app" tabindex="-1" data-page="${name}">` + frag.replace(/<!--.*?-->\n?/gs, '') + '</main>' + abs(chromeBottom)) + FOOT;
    await mkdir(path.join(OUT, name), { recursive: true });
    await writeFile(path.join(OUT, name, 'index.html'), page); names.push(name);
  }
  return names;
}

/** Addresses the previous site answered to. Each becomes a small page that sends the reader on, so old links and bookmarks keep working. */
const REDIRECTS = [
  ['chart', "(function(){var s=new URLSearchParams(location.search).get('section')||'';var m={ledger:'/#ledger',tree:'/#tree',field:'/#june',forecast:'/#harbor',stations:'/stations/',compact:'/compact/'};location.replace(m[s]||'/#toll');})();", '/#toll'],
  ['bring', "location.replace('/#contribute');", '/#contribute'],
  ['sources', "location.replace('/#ledger');", '/#ledger'],
];
async function redirects() {
  for (const [name, js, fallback] of REDIRECTS) {
    await mkdir(path.join(OUT, name), { recursive: true });
    await writeFile(path.join(OUT, name, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>The Life-Saving Lab</title><meta name="robots" content="noindex"><script>${js}</script><meta http-equiv="refresh" content="0;url=${fallback}"></head><body><p>This page moved. <a href="${fallback}">Continue to The Life-Saving Lab.</a></p></body></html>\n`);
  }
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(path.join(OUT, 'data'), { recursive: true });
  const body = await readFile(path.join(SRC, 'index.html'), 'utf8');
  await writeFile(path.join(OUT, 'index.html'), HEAD + local(body.replace(/^<title>.*<\/title>\n<meta name="claude:viewport-fit-sides"[^>]*>\n/, '')) + FOOT);
  for (const f of ['site.css', 'charts.js', 'extra.js', 'register.js', 'lend.js', 'pilots.js', 'harbor.js', 'briefs.js', 'app.js', 'static.js']) await cp(path.join(SRC, f), path.join(OUT, f));
  const pages = await staticPages(body);
  await redirects();
  await cp(path.join(SRC, 'legacy', 'drowning-estimates.json'), path.join(OUT, 'data', 'drowning-estimates.json'));
  await cp(path.join(SRC, 'img'), path.join(OUT, 'img'), { recursive: true });
  for (const [from, to] of DATA) await cp(path.join(ROOT, from), path.join(OUT, to));
  await writeFile(path.join(OUT, 'data', 'changelog.json'), JSON.stringify(changelog(), null, 1));
  await writeFile(path.join(OUT, 'data', 'briefs.json'), JSON.stringify(await briefs(), null, 1));
  await writeFile(path.join(OUT, '.nojekyll'), '');
  await writeFile(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.txt\n`);
  await cp(path.join(SRC, 'llms.txt'), path.join(OUT, 'llms.txt'));
  await writeFile(path.join(OUT, '404.html'), head('Not found · The Life-Saving Lab', DESC, '/404.html') + body.slice(0, body.indexOf('<main')).replace(/href="#/g, 'href="/#').replace(/href="(site\.css)"/g, 'href="/$1"') + '<main id="app"><section class="section"><div class="wrap stack"><p class="eyebrow">Not found</p><h1 class="display h2">There is no page at this address.</h1><p class="lede">The site moved to one page with sections. <a href="/">Start at the front</a>, or open <a href="/#ledger">the ledger</a>, <a href="/#tree">the tree</a>, <a href="/history/">the history</a> or <a href="/bridge/">the span brief</a>.</p></div></section></main>' + FOOT);
  await writeFile(path.join(OUT, 'sitemap.txt'), ['/', ...pages.map((p) => `/${p}/`)].map((p) => ORIGIN + p).join('\n') + '\n');
  console.log(`built ${OUT}: index.html, ${pages.length} pages (${pages.join(', ')}), ${REDIRECTS.length} redirects, ${DATA.length + 3} data files`);
}
main().catch((e) => { console.error(e); process.exit(1); });
