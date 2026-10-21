# Life-Saving Lab — open data

Everything behind thelifesavinglab.org, in the open: the sized global toll of drowning as a range with its sources
(`estimates/`), the decision tree of measures graded by evidence, an hourly watch of reported drownings (`watch/`), a
board of small tasks anyone's AI assistant can take (`tasks/`) with public receipts (`receipts/`), the static site
(`site/`), and a small Cloudflare Worker API. Provenance first: every row names its source, its grade, and the rule for
what it must not be added to.

> **Not a rescue service.** Nothing here dispatches, monitors, or advises in an emergency.
> Distress at sea: VHF channel 16 or the coast guard. Crisis: call or text 988 (U.S.).

## What this is, and is not

- It **is** two ledgers kept apart: `seeds/` (named events with counted tolls; CC0; release 0.1.0: 38 observations, 34 sources, 16 non-additive pairs) and `estimates/` (yearly figures, rates, shares and definitions behind the site's range; CC BY 4.0; version 0.7.0, 79 rows). Events are counted, estimates are modelled, and the site never adds one to the other.
- It **is not** a measure of lives saved. No figure here counts lives saved, and the API will not compute one.
- It **is not** authoritative over its sources. Where a source and this file disagree, the source wins; open a correction.
- It holds **no personal data**: no names of the dead or the living, no contacts, no locations of individuals.
- thelifesavinglab.org is built from `site/` in this repository (`node site/build.mjs`) and served as a static-assets Worker; `site/README.md` says how a push reaches it. The API Worker (`src/worker.js`) is separate and has no route.

## Quick start

```sh
npm ci
npm test                 # 70+ tests: libs, schema/migrations, API contracts, hashes, PII, bundles, the board, data invariants
npm run build:data       # seeds/ -> src/data/release.json, dist/export.{json,csv}, dist/manifest.json, seeds/seed.sql
npm run check            # rebuild + verify committed artifacts are byte-identical + tests + bundles + typecheck + lint
python3 estimates/build_data.py && python3 estimates/build_tree.py   # the figures ledger, the toll layers, the tree
python3 tasks/build_tasks.py                                        # the board
node site/build.mjs && python3 -m http.server -d site/dist 8080      # the site, at http://localhost:8080
node scripts/tasks.mjs list                                          # lend-your-agent tasks; `prompt <id>` for the pack
npx wrangler dev         # local API at http://localhost:8787/v1
```

Node 22.5+ (tests use the built-in `node:sqlite` to run the real migrations).

## API (v1)

OpenAPI 3.1 at `/v1/openapi.json`. Reads come from the bundled release; the only writes are a staged contribution and a staged bundle.

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
| GET | `/v1/tasks`, `/v1/tasks/{id}`, `/v1/tasks/{id}/prompt` | the lend-your-agent board; a task; its prompt pack as plain text |
| POST | `/v1/bundles` | hand back a bundle; machine checks first, a bundle that fails them (any personal data included) is refused and never stored |
| GET / POST | `/v1/review/bundles`, `/v1/review/bundles/{id}` | reviewer: staged bundles; `accepted`, `declined` or `needs-work` with the receipt id (bearer token) |

Verify an export: `curl -s $API/v1/export.csv | shasum -a 256` must equal `sha256["export.csv"]` in `/v1/releases/latest`.

## How data changes

Contribution → validation → staged or quarantined → reviewer accepts/declines → a pull request edits `seeds/`
→ `npm run check` → new release version with new hashes. The API never writes canonical rows. See
`docs/ARCHITECTURE.md`, `GOVERNANCE.md`, `CONTRIBUTING.md`.

## The watch

`watch/` holds a scheduled job (`.github/workflows/watch.yml`, hourly) that reads public feeds and queues reports that look
like a drowning, a search, a capsize or a rescue, for a person to read. It stores links, sources, dates and a derived kind:
no headline text and no names. `scripts/watch-review.mjs` turns a report into a register row. See `watch/README.md`.

## Lend your agent an hour

`tasks/` is a board of small, well-defined tasks that anyone can hand to an AI assistant they already pay for (ChatGPT,
Claude, Gemini, Grok, or any other): verify one figure, find one primary source, write one row. `node scripts/tasks.mjs
prompt <id>` prints a self-contained prompt pack; the agent returns a JSON bundle; `node scripts/tasks.mjs check` runs the
machine checks (schema, personal data, quote length, press domains, sums); a person decides; `receipt` writes a public
receipt to `receipts/lend.json` with the bundle's hash. Accepted bundles may propose follow-ups, which `promote` puts on
the board. See `tasks/README.md`.

## Estimates

`estimates/` is the ledger behind the site's sizing of the global toll: every figure with its source, scope, year, grade
and the rule for what it must not be added to, plus the toll layers and the decision tree. See `estimates/README.md`.

## Briefs

`docs/briefs/` holds one-page briefs for a co-host (Applied Wisdom), for partners and for funders. Everything in them is
proposed unless marked otherwise.

## Documents

`DATA_POLICY.md` · `SECURITY.md` · `CONTRIBUTING.md` · `GOVERNANCE.md` · `docs/ARCHITECTURE.md` ·
`docs/CITATION_TIERS.md` · `docs/THREAT_MODEL.md` · `docs/PRIVACY_PII.md` · `docs/OPERATIONS.md` (setup, migrations, rollback) ·
`docs/SOURCE_REVIEW.md` · `docs/AI_ASSISTANCE.md`

## Licenses

Code: MIT (`LICENSE`). Data: `seeds/`, `src/data/`, `dist/` and the watch files under CC0 1.0; `estimates/`, `tasks/`, `receipts/` and the briefs under CC BY 4.0 (`DATA_LICENSE.md` has the split). Sources keep their own terms; we store citations, not their text.
