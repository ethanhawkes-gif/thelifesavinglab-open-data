#!/usr/bin/env node
// Builds the static site into site/dist: wraps src/index.html in a document, copies the assets, and pulls the data
// from the repository's own folders (estimates/, tasks/, receipts/, watch/) so the site never carries a second copy.
//   node site/build.mjs            # writes site/dist
//   npx serve site/dist            # or: python3 -m http.server -d site/dist 8080
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
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

const HEAD = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="The Life-Saving Lab: an open ledger of how many people drown, where the counting fails, and what has been shown to change it. A teaching and research project on Portsmouth Harbor.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 34 34'%3E%3Ccircle cx='17' cy='17' r='11.5' fill='none' stroke='%23fff' stroke-width='7'/%3E%3Ccircle cx='17' cy='17' r='11.5' fill='none' stroke='%23C4402B' stroke-width='7' stroke-dasharray='9.03 9.03' transform='rotate(-22 17 17)'/%3E%3C/svg%3E">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>
`;
const FOOT = `
</body></html>
`;

/** The data's own history: every commit that touched the estimates, the board or the receipts, newest first. Empty when git is absent. */
function changelog() {
  try {
    const raw = execFileSync('git', ['log', '--date=short', '--format=%ad%x1f%h%x1f%s', '-n', '60', '--', 'estimates', 'tasks/tasks.json', 'receipts/lend.json', 'watch/sources.json'], { cwd: ROOT, encoding: 'utf8' });
    const entries = raw.trim().split('\n').filter(Boolean).map((l) => { const [date, sha, subject] = l.split('\x1f'); return { date, sha, subject }; });
    return { schema: 'lifesavinglab.changelog.v1', generated: new Date().toISOString(), entries };
  } catch { return { schema: 'lifesavinglab.changelog.v1', generated: new Date().toISOString(), entries: [] }; }
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(path.join(OUT, 'data'), { recursive: true });
  const body = await readFile(path.join(SRC, 'index.html'), 'utf8');
  await writeFile(path.join(OUT, 'index.html'), HEAD + body + FOOT);
  for (const f of ['site.css', 'charts.js', 'extra.js', 'register.js', 'lend.js', 'pilots.js', 'app.js']) await cp(path.join(SRC, f), path.join(OUT, f));
  await cp(path.join(SRC, 'img'), path.join(OUT, 'img'), { recursive: true });
  for (const [from, to] of DATA) await cp(path.join(ROOT, from), path.join(OUT, to));
  await writeFile(path.join(OUT, 'data', 'changelog.json'), JSON.stringify(changelog(), null, 1));
  await writeFile(path.join(OUT, '.nojekyll'), '');
  await writeFile(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  console.log(`built ${OUT}: index.html, 7 assets, ${DATA.length + 1} data files`);
}
main().catch((e) => { console.error(e); process.exit(1); });
