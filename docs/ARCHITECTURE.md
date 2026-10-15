# Architecture

```
seeds/ledger.json ─┐                       ┌─> dist/export.json  (canonical JSON, sorted keys)
seeds/release-meta ┴─ scripts/build-release ┼─> dist/export.csv   (sorted rows, CRLF, formula-safe)
                                            ├─> dist/manifest.json (counts + SHA-256 of both exports)
                                            └─> src/data/release.json ── bundled into the Worker
src/data/release.json ─ scripts/release-to-sql ─> seeds/seed.sql (optional: load canonical rows into D1/SQLite)

Request ─> Worker (src/worker.js)
   GET  /v1/*                 -> served from the bundled release (no database read)
   POST /v1/contributions     -> validate -> classify (rejected | staged | quarantined) -> D1 contributions + audit_events
   *    /v1/review/*          -> bearer token -> decision recorded in D1; canonical data untouched
   GET  /v1/tasks[/{id}[/prompt]] -> the lend-your-agent board and prompt packs, bundled from tasks/tasks.json
   POST /v1/bundles           -> checkBundle (schema, PII, quotes, domains, sums) -> refused, or D1 bundles + audit_events
   *    /v1/review/bundles/*  -> bearer token -> accepted | declined | needs-work, with the receipt id

estimates/build_data.py ─> estimates/ledger.json, ledger.csv, toll.json   (the sized toll: every figure with source, grade, do-not-add rule)
estimates/build_tree.py ─> estimates/tree.json                             (the decision tree; measures cite ledger rows)
tasks/build_tasks.py    ─> tasks/tasks.json                                (the board: tasks generated from the ledger's gaps, plus the prompt preamble; carries each task's latest accepted receipt id from receipts/lend.json)
watch.yml (hourly)      ─> scripts/watch.mjs ─> watch/queue.json, feed.json (reported drownings: links, kinds, no text, no names)
site/build.mjs          ─> site/dist/ (the static site; copies data from estimates/, tasks/, receipts/, watch/; renders docs/briefs; git log -> changelog)
```

**Two ledgers.** `seeds/ledger.json` is the canon of *events* (named disasters with counted tolls, tiered sources); it
feeds the Worker's read API and `dist/export.*`. `estimates/ledger.json` is the ledger of *figures* (yearly estimates,
rates, shares, definitions) behind the site's sizing of the global toll. They are kept apart on purpose: events are
counted, estimates are modeled, and the site never adds one to the other.

**The loop that compounds** (`tasks/README.md`): a task is a diff against versioned data; the prompt pack is versioned;
`src/lib/bundles.js` holds the checks shared by the CLI (`scripts/tasks.mjs`), the Worker and, mirrored, the site;
receipts (`receipts/lend.json`) carry the bundle's SHA-256; accepted bundles propose follow-ups that `promote` puts
on the board; `agree` compares two agents' bundles on one task field by field.

**Why canonical data is bundled, not queried.** The release is the unit of truth: a version, two hashes, and the
artifacts in git. Serving it from the bundle makes every read reproducible and makes "the API wrote canonical data"
impossible by construction. D1 holds only what is pending, and the audit trail.

**Merge path.** Accepted contribution -> maintainer edits `seeds/` in a PR (citing the contribution id) -> CI runs
`npm run check` (rebuild must be byte-identical to committed artifacts) -> merge -> tag -> deploy. Lineage rows in
`seed.sql` record `canon-import` or `contribution` per observation per release.

**Determinism.** No clock reads in the build. Keys sorted (`canonicalJSON`), rows sorted by id, fixed line endings.
Tests rebuild twice and compare bytes, and compare against the committed manifest.

**Health.** `/v1/health` is liveness only. `/v1/status` reports the release version, hashes, whether the staging
store is bound, and what was held out of the release.

**Entities** (see `migrations/0001_init.sql`): organizations, sources, datasets, measures, observations,
non_additive_pairs, releases, contributions, lineage, audit_events. `measures` is defined but not yet populated;
release 0.1.0 carries a structured `toll_parsed` (kind, low, high, per_year, unit) on each observation instead.

Gemini's longer architecture/evidence-model draft (advisory) is kept at `receipts/gemini/pass1-architecture.md`.
