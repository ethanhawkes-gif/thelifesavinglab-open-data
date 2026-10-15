# The site

`site/src/` is the source of thelifesavinglab.org's prototype: one page, hash routes (`#toll`, `#ledger`, `#tree`,
`#watch`, `#june`, `#wisdom`, `#gaps`, `#register`, `#lend`, `#contribute`, `#glossary`), no build step beyond copying
files, no framework, no tracking. The data it shows is not kept here: `site/build.mjs` copies it from `estimates/`,
`tasks/`, `receipts/` and `watch/` at build time, so a merged change to any of those is live on the next deploy.

```
node site/build.mjs                 # writes site/dist
python3 -m http.server -d site/dist 8080   # preview at http://localhost:8080
```

## Deploying

`.github/workflows/pages.yml` builds and publishes `site/dist` to GitHub Pages on every push to `main` that touches the
site or its data. One-time setup: in the repository's Settings → Pages, set Source to "GitHub Actions" (the workflow
tries to do this itself; if the first run fails at `configure-pages`, do it by hand and re-run). To serve it at
thelifesavinglab.org, add the domain under Settings → Pages → Custom domain and point the domain's DNS at GitHub Pages;
`site/build.mjs` can then write a `CNAME` file (add the line when the domain is set).

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
| `src/lend.js` | The task board, one-click prompt links, the bundle checker and the receipts wall. |
| `src/pilots.js` | The one-page pilot format, the forecast rule, three worked examples and the template. |
| `src/charts.js` | Inline SVG charts: the toll bar, layer strips, estimate dots, income, regions, ages. |
| `src/img/` | Photographs by Ethan Hawkes, web-sized. |

## Rules the site keeps

No figure is summed across sources or waters unless the row that does it says so. Every number links to its ledger row.
Nothing on the site dispatches help, and the banner says so on every page. No names, no precise positions, no tracking.
