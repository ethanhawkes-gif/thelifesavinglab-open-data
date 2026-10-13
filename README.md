# Life-Saving Lab — open data

Cited figures on deaths at sea and drowning, with the rules that stop them being misused, served by a small
Cloudflare Worker. Provenance first: every row names its source, a confidence word, and a citation tier, and the
dataset ships with a list of figure pairs that must never be added, subtracted, or averaged.

> **Not a rescue service.** Nothing here dispatches, monitors, or advises in an emergency.
> Distress at sea: VHF channel 16 or the coast guard. Crisis: call or text 988 (U.S.).

## What this is, and is not

- It **is** a versioned, hashed, CC0 compilation of citation metadata from the Life-Saving Lab chart (release 0.1.0: 38 observations, 34 sources, 16 non-additive pairs; one sensitive entry held out for human review).
- It **is not** a measure of lives saved. No figure here counts lives saved, and the API will not compute one.
- It **is not** authoritative over its sources. Where a source and this file disagree, the source wins; open a correction.
- It holds **no personal data**: no names of the dead or the living, no contacts, no locations of individuals.
- The live site thelifesavinglab.org is a different Worker. This repository does not deploy to it.

## Quick start

```sh
npm ci
npm test                 # 40+ tests: libs, schema/migrations, API contracts, hashes, PII quarantine, security smoke
npm run build:data       # seeds/ -> src/data/release.json, dist/export.{json,csv}, dist/manifest.json, seeds/seed.sql
npm run check            # rebuild + verify committed artifacts are byte-identical + tests + typecheck + lint
npx wrangler dev         # local API at http://localhost:8787/v1
```

Node 22.5+ (tests use the built-in `node:sqlite` to run the real migrations).

## API (v1)

OpenAPI 3.1 at `/v1/openapi.json`. Reads come from the bundled release; the only write is a staged contribution.

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/health`, `/v1/status` | liveness; release version, counts, hashes |
| GET | `/v1/observations?tier=&confidence=&cause=` | list |
| GET | `/v1/observations/{id}` | one row plus the figures it must not be combined with |
| GET | `/v1/non-additive`, `/v1/non-additive/check?ids=a,b` | forbidden pairs; check a proposed combination |
| GET | `/v1/sources` | citation metadata |
| GET | `/v1/releases/latest`, `/v1/export.json`, `/v1/export.csv` | manifest with SHA-256; exports whose hash matches |
| POST | `/v1/contributions` | stage a correction or addition (validated; PII -> quarantine) |
| GET | `/v1/review/queue` | pending contributions with payloads (bearer token) |
| POST | `/v1/review/{id}` | reviewer decision: `accepted` or `declined` (bearer token) |

Verify an export: `curl -s $API/v1/export.csv | shasum -a 256` must equal `sha256["export.csv"]` in `/v1/releases/latest`.

## How data changes

Contribution → validation → staged or quarantined → reviewer accepts/declines → a pull request edits `seeds/`
→ `npm run check` → new release version with new hashes. The API never writes canonical rows. See
`docs/ARCHITECTURE.md`, `GOVERNANCE.md`, `CONTRIBUTING.md`.

## Documents

`DATA_POLICY.md` · `SECURITY.md` · `CONTRIBUTING.md` · `GOVERNANCE.md` · `docs/ARCHITECTURE.md` ·
`docs/CITATION_TIERS.md` · `docs/THREAT_MODEL.md` · `docs/PRIVACY_PII.md` · `docs/OPERATIONS.md` (setup, migrations, rollback) ·
`docs/SOURCE_REVIEW.md` · `docs/AI_ASSISTANCE.md`

## Licenses

Code: MIT (`LICENSE`). Data: CC0 1.0 (`DATA_LICENSE.md`). Sources keep their own terms; we store citations, not their text.
