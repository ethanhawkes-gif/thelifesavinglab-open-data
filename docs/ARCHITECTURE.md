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
```

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
