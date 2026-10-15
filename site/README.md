# The site

`site/src/` is the source of thelifesavinglab.org's prototype: one page, hash routes (`#toll`, `#ledger`, `#tree`, `#pilots`,
`#harbor`, `#watch`, `#june`, `#wisdom`, `#gaps`, `#register`, `#lend`, `#contribute`, `#glossary`), no build step beyond copying
files, no framework, no tracking. The data it shows is not kept here: `site/build.mjs` copies it from `estimates/`,
`tasks/`, `receipts/` and `watch/` at build time, so a merged change to any of those is live on the next deploy.

```
node site/build.mjs                 # writes site/dist
python3 -m http.server -d site/dist 8080   # preview at http://localhost:8080
```

## Checking

`python3 site/check.py` opens the built site in a headless browser and fails on horizontal scroll at phone width,
console errors, text below WCAG AA contrast, heading-order or labelling slips, and a register or lend checker that
does not work. `--shots` writes full-page screenshots to `site/dist/shots/`. CI runs it on every change to the site or
its data (`.github/workflows/site-check.yml`) and keeps the screenshots for a week.

## Deploying

The built site is thelifesavinglab.org, served as a Cloudflare Worker that holds only static assets (`site/wrangler.toml`,
assets directory `site/dist`, custom domain `thelifesavinglab.org`). Two ways to put a build there:

1. **From a machine with wrangler logged in** (`wrangler login` once):
   `node site/build.mjs && npx wrangler deploy --config site/wrangler.toml`. The Worker name in the config must be the
   one that already holds the custom domain, so the deploy replaces the live site in place; pass `--name <name>` otherwise.
2. **From GitHub on every push** (`.github/workflows/deploy-site.yml`): add the repository secret `CLOUDFLARE_API_TOKEN`
   (an API token from the "Edit Cloudflare Workers" template) and the variable `CLOUDFLARE_ACCOUNT_ID`; set the variable
   `SITE_WORKER_NAME` if the live Worker is not called `thelifesavinglab`. Until the secret exists the workflow only
   builds. Nobody but Cloudflare and GitHub ever sees the token.

What a deploy carries: the one-page app at `/`, the pages the previous site had (`/history/`, `/bridge/`, `/cohort/`,
`/compact/`, `/stations/`), forwarding pages for its old addresses (`/chart`, `/bring`, `/sources`), the previous
site's data file at its old address (`/data/drowning-estimates.json`), a `404.html`, `robots.txt`, `sitemap.txt`,
`llms.txt`, and the data files under `/data/`.

`.github/workflows/pages.yml` can publish the same build to GitHub Pages instead (set the repository's Pages source to
"GitHub Actions" and the variable `PAGES_ENABLED` = `true`); it is a fallback, not the site of record.

The same source is also published as a private Claude artifact for review; that copy is refreshed by a daily scheduled
task and is not the site of record.

## Files

| File | What |
| --- | --- |
| `src/index.html` | The page shell: safety banner, header, `<main id="app">`, footer. No doctype; the build adds the document head. |
| `src/site.css` | Tokens (cream ground, navy, teal, brass, lifebuoy red), type (Newsreader, Public Sans, IBM Plex Mono), components. |
| `src/app.js` | Router, data loading, home, toll, ledger, tree, wisdom and contribute pages. |
| `src/extra.js` | The live counter, the June lab, the watch, the gaps page, the glossary, the frontier and selection sections. |
| `src/register.js` | The incident register as a working tool (rows stay in the browser until exported). |
| `src/pages/*.html` | The static pages (history, the span brief, the first cohort, the compact, the stations): fragments the build wraps in the site's chrome and serves at `/<name>/`. |
| `src/static.js` | The static pages' menu, colophon and counters. |
| `src/legacy/` | The previous site's data file, kept at its old address. |
| `wrangler.toml` | The site as a static-assets Worker on thelifesavinglab.org. |
| `src/lend.js` | The task board, one-click prompt links, the bundle checker and the receipts wall. |
| `src/pilots.js` | The one-page pilot format, the forecast rule, three worked examples and the template. |
| `src/harbor.js` | This water: what is known about Portsmouth Harbor with sources, who answers a call, the local gaps, the three pilots. |
| `src/charts.js` | Inline SVG charts: the toll bar, layer strips, estimate dots, income, regions, ages. |
| `src/img/` | Photographs by Ethan Hawkes, web-sized. |

## Rules the site keeps

No figure is summed across sources or waters unless the row that does it says so. Every number links to its ledger row.
Nothing on the site dispatches help, and the banner says so on every page. No names, no precise positions, no tracking.
