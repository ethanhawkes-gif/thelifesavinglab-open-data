<!-- agy-gemini-run: label=lsl-pass1-arch model_requested=gemini-3.8-flash-high conversation_id=3463201a-2ae2-40cc-8a56-8bc024e80c95 at=2026-10-13T13:04:54.075Z tokens={"input_tokens":49273,"output_tokens":8647,"thinking_tokens":4564,"cache_read_tokens":0,"total_tokens":57920} — ADVISORY MODEL OUTPUT, not verified fact -->

# ARCHITECTURE

### System Components
1. **Cloudflare Worker (`src/worker.js`)**: Plain JS ES module edge router. Serves canonical read requests directly from an in-memory/asset-bundled immutable release artifact. Routes write payloads through runtime validation and PII detection. Performs zero canonical writes.
2. **Cloudflare D1 (`lsl_governance_db`)**: SQLite edge database storing write-path state only. Contains 4 tables: `staged_contributions`, `quarantined_contributions`, `review_decisions`, and `audit_events`. Holds no canonical records.
3. **Canonical Git Repository**: Sole source of truth for canonical data (`seeds/ledger.json`, `seeds/sources.json`, `seeds/non_additive.json`), CI verification pipelines (`node:test`), and migration scripts.
4. **CI Release Builder (GitHub Actions)**: Validates staged PRs, runs linters and non-additive graph cycle detectors, applies deterministic RFC 8785 JSON formatting, computes SHA-256 digests, and generates the immutable release manifest.
5. **Edge Asset Bundle**: Immutable static release artifact distributed to the Worker runtime on deployment, decoupling canonical reads entirely from D1 database availability.

### Request Flow
```
[Client Read: /v1/ledger] ----> [Cloudflare Worker] ----> [Embedded Immutable Release (RAM/Asset)]
                                                                    (0 D1 queries, <15ms)
[Client Write: /v1/propose] --> [Cloudflare Worker]
                                      |
                      [Validate Schema & Check PII]
                                      |
                    +-----------------+-----------------+
                    |                                   |
           (Clean & Known Target)            (PII / Unknown ID / Sensitive)
                    v                                   v
       [D1: staged_contributions]          [D1: quarantined_contributions]
                    \                                   /
                     +--------> [D1: audit_events] <----+
```
- **Read Path (`GET /v1/ledger`, `GET /v1/observations/:id`, `GET /v1/manifest`)**: Served directly from Worker memory. Never touches D1. Returns canonical data, active release version, and integrity hash.
- **Write Path (`POST /v1/contributions`)**: Validates JSON schema and inspects for PII at the edge. If payload is clean and references known entities, inserts into `staged_contributions`. If PII is detected, target ID is unknown, or target is flagged sensitive, inserts into `quarantined_contributions`. An immutable entry is appended to `audit_events`. Returns HTTP 202 with contribution ID.

### Contribution Lifecycle: Staging to Release
```
[POST Payload] -> [Edge Validation] -> [D1 Staged/Quarantined] -> [Human Review CLI/API]
                                                                          |
[Release Deployment] <- [CI Build & Hash] <- [PR Merged] <- [Export Tool to Git Branch]
```
1. **Staging & Quarantine**: Contributions arrive via API into D1. Records flagged by automated PII filters or topic sensitivity guards (e.g., bridge self-harm) are quarantined with quarantine reason codes.
2. **Human Review**: Reviewers inspect queued submissions using CLI tooling (`lsl-review`) querying D1 over Cloudflare REST API. A review transaction writes a verdict (`approved`, `rejected`, `amended`) to `review_decisions` and logs to `audit_events`.
3. **Merge-by-PR**: An automated scheduled workflow extracts approved contributions from D1, formats them into seed changes, generates a git branch, and opens a GitHub Pull Request. Maintainers review changes, verify citations, run `node:test`, and merge into `main`. Direct canonical writes via API or D1 are structurally impossible.
4. **Release**: Merging to `main` triggers the release pipeline. CI builds the distribution artifact, verifies constraints, updates `manifest.json`, and deploys the bundle to the Worker environment.

### Release Versioning and SHA-256 Manifest
Releases use Calendar Versioning with build increments: `YYYY.MM.<release_sequence>` (e.g., `2026.10.1`). Every release generates an immutable `manifest.json`:
```json
{
  "release_version": "2026.10.1",
  "published_at": "2026-10-13T12:00:00Z",
  "git_commit": "c4b8e219f7a94dfb1d2836d5e714659b8a3e4210",
  "canonical_manifest_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "artifacts": {
    "ledger.json": {
      "records": 39,
      "sha256": "4a7d1ed414474e4033ac29ccb8653d9b024ee593f0dec1122a27ffb22b10ab49"
    },
    "non_additive.json": {
      "pairs": 16,
      "sha256": "9b1c2b53f6580f4f9f7a93557e4922110298a4d46777a82c40c888c3e80d467d"
    },
    "sources.json": {
      "records": 31,
      "sha256": "f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2"
    }
  }
}
```
The Worker verifies this digest during cold start. If computed SHA-256 hashes fail integrity verification, the Worker refuses to boot.

### Health and Status Subsystem
`GET /v1/status` exposes platform health without leaking operational credentials:
```json
{
  "status": "healthy",
  "runtime": "cloudflare-worker-esm",
  "canonical_release": "2026.10.1",
  "manifest_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "d1_connectivity": "connected",
  "queue_depth": { "staged": 4, "quarantined": 2 }
}
```
A lightweight heartbeat verifies D1 read availability against `audit_events`. Read path degradation alerts fire immediately if the in-memory manifest is unverified.

### Export Determinism
To guarantee identical SHA-256 digests across builds:
1. **RFC 8785 Canonical JSON**: Object keys are sorted lexicographically by UTF-16 code units. No insignificant whitespace in release artifacts.
2. **Deterministic Entity Sorting**: Observations are sorted by `id` ascending. Non-additive constraints are sorted by canonical composite key `min(a_id, b_id) + ":" + max(a_id, b_id)`.
3. **Strict UTC Formatting**: All timestamps adhere to ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ssZ`) with zero fractional second drift.

### Rollback Strategy
Because the canonical runtime is stateless and bundled into Worker releases:
1. **Zero Database Migrations for Rollbacks**: D1 stores only contribution drafts and review logs. Canonical rollback never requires database rollback or data restoration.
2. **Instant Atomic Revert**: Rollbacks execute via Cloudflare deployments CLI (`wrangler rollback`) or pinning the Worker release artifact pointer to a prior verified git tag.
3. **Audit Trail**: Every release deployment or rollback action logs an event to D1 `audit_events` with actor ID, prior commit SHA, and rollback target SHA.

# EVIDENCE MODEL

### Core Entities and Schemas
1. **`organizations`**: Entities that count, regulate, or adopt safety rules.
   `{ id, name, jurisdiction, type: 'ngo'|'state_agency'|'supranational'|'volunteer_service', url }`
2. **`sources`**: Public evidentiary origin. Strict metadata only.
   `{ id, title, publisher, published_date, url, access_terms, license, is_public_record: boolean }`
3. **`datasets`**: Collections of data published by a source over time.
   `{ id, source_id, title, frequency: 'annual'|'ad_hoc'|'continuous', reporting_method }`
4. **`measures`**: Formal quantification rules preventing non-additive conflation:
   - `unit`: Unit of count (`'persons_fatal'`, `'persons_rescued'`, `'vessels_lost'`, `'regulatory_trigger'`).
   - `window`: Exact temporal span (`'annual'`, `'cumulative'`, `'multi_year_average'`, `'point_event'`).
   - `population`: Specific subset (`'commercial_fishers'`, `'pleasure_boaters'`, `'children_under_5'`, `'merchant_seafarers'`).
   - `geography`: Spatial boundary (`'global'`, `'us_national'`, `'coastal'`, `'inland_home'`).
   - `counting_system`: Instrument of capture (`'vital_statistics_death_certificates'`, `'voluntary_agency_filing'`, `'maritime_investigation_commission'`, `'academic_extrapolation'`).
5. **`observations`**: Asserted figures from the canon.
   `{ id, label, measure: { unit, window, population, geography, counting_system }, raw_toll, confidence, tier, tier_basis, source_id, dataset_id }`
6. **`contributions`**: Proposed modifications staged in D1.
   `{ id, kind: 'correction'|'new_observation'|'source_metadata'|'non_additive_pair', payload, status: 'staged'|'quarantined'|'rejected'|'merged', submitted_at }`
7. **`provenance` / `lineage`**: Audit trail linking an observation to its source, review decision, PR commit, and release version.
8. **`releases`**: Git release snapshot record.
   `{ version, git_commit_sha, manifest_sha256, published_at, published_by }`
9. **`audit_events`**: Append-only log in D1.
   `{ event_id, event_type: 'SUBMIT'|'QUARANTINE'|'REVIEW'|'EXPORT'|'DEPLOY', entity_id, actor, payload_hash, timestamp }`

### Citation Tiers (T1–T4)
- **T1 (Official Register / Census / Inquiry)**: Official statutory death registers, inquiry commissions, formal government census (e.g., British Wreck Commission, USCG Boating Statistics, Senegalese official toll).
- **T2 (Published Method Estimate)**: Institutional or peer-reviewed academic modeling with published methodology (e.g., WHO Global Status Report, Peterson et al. in *Injury Prevention*, Willis et al. in *Marine Policy*).
- **T3 (Historical / Secondary Reconstruction)**: Reconstruction from logs, partial manifests, or historical wartime research with incomplete documentation (e.g., Trans-Atlantic Slave Trade Database, Operation Hannibal estimates, Doña Paz passenger reconstructions).
- **T4 (Unrecorded / Absence Register)**: Formal documentation of an absence of census or unrecorded loss (e.g., Coastal wrecks with no register, Piscataqua River Bridge lack of published annual census).

### Confidence Vocabulary
Strict three-value enumeration:
- `'counted'`: Direct registry enumeration from physical investigation, formal inquiry, or statutory certificates.
- `'estimated'`: Statistical modeling, extrapolation, or historical estimation range.
- `'unrecorded'`: Absence of records; ledger entry explicitly documents an uncounted phenomenon.

### Formal Non-Additive Constraint Model
Non-additive rules enforce the canon's core dictum: figures must not be summed, subtracted, or averaged into fictional totals.
Represented as symmetric edge pairs `(a_id, b_id)` categorized under 7 formal reason classes:
1. `SUBSET_CONTAINMENT`: One figure is an internal subset of another; summing counts the dead twice (e.g., `mediterranean` inside `iom-all`).
2. `TEMPORAL_WINDOW_OVERLAP`: Overlapping survey windows; averaging invents a synthetic timeframe (e.g., `cdc-drown-2018` [2018–2021] and `cdc-drown-2020` [2020–2022]; `peterson-2022` inside `cdc-drown-2020`).
3. `DISPARATE_COUNTING_SYSTEM`: Data gathered via incompatible reporting systems (e.g., `cdc-drown-2018` [NVSS vital statistics] vs. `cpsc-pool-2026` [consumer product incident reports]; `peterson-craft` vs. `us-rec-2024`).
4. `DISPARATE_POPULATION_OR_SETTING`: Disjoint demographic or physical environments (e.g., `cpsc-pool-2026` [children in pools/spas] vs. `cpsc-home` [children in bathtubs]; `us-rec-2024` [recreational boats] vs. `us-fishing` [commercial fleet]).
5. `COMPETING_METHODOLOGICAL_ESTIMATES`: Independent estimates for the same phenomenon; combining them synthesizes an unverified number (e.g., `ilo-fishing` [24k/yr] vs. `fish-safety` [100k/yr]; `who-drowning` [236k/yr] vs. `who-2021` [300k/yr]).
6. `INCOMMENSURABLE_METRIC_UNITS`: Incompatible unit types (e.g., `usla-rescues` [rescues] vs. `usla-guarded` [fatalities]; subtracting yields no valid "lives saved" metric).
7. `PARTIAL_VOLUNTARY_COLUMNS`: Columns representing voluntary partial reporting that do not sum to a national total (e.g., `usla-guarded` [32] vs. `usla-unguarded` [118]).

### Citation-Metadata-Only and Source License Rules
1. **Metadata Only**: Stores only title, author/publisher, published date, canonical DOI/URL, and access constraints.
2. **Zero Full-Text Ingestion**: System never stores raw article text, scraping extracts, or copyrighted PDF pages.
3. **Access Terms Tracking**: Records licensing status (`open_access`, `public_domain_usgov`, `paywall`, `unreviewed`). Prohibits redistributing paywalled or proprietary text.

### PII and Sensitive Data Guardrails
- **Zero Names of Victims/Survivors**: Observation records may never store names of casualties, callers, survivors, or family members. Historical public figures (e.g., Richard Etheridge, Sumner Kimball) are tracked in educational references only.
- **Automated PII Edge Scrubber**: Scans inbound payloads for email addresses, phone numbers, SSNs, and GPS precision >100m. Detections trigger immediate transfer to `quarantined_contributions`.
- **Self-Harm / Span Safeguard**: Records touching bridge spans or suicide methods (e.g., `piscataqua-span`) are excluded from general contributions, mandated for quarantine, and require verification of crisis messaging (US 988 lifeline reference) before any human approval.

### Concrete Defects in Current Seeds and Libs
1. **Flawed Tier Derivation in `tiers.js`**: `deriveTier()` returns `'T1'` immediately whenever `confidence === 'counted'`, bypassing source inspection entirely. Consequently, `portland` (sourced from "Contemporary accounts") is incorrectly marked `T1` instead of `T3`. Furthermore, `cape-town` has `confidence: 'counted'`, giving it `T1` even though its toll is `"Not a death toll"` (regulatory trigger).
2. **Absence of Measure Dimensions in `seeds/ledger.json`**: Observations store only a flat string `toll` (e.g. `"4,345 a year"` or `"192 on Portland, more ashore of her"`). There are no structured fields for `unit`, `window`, `population`, `geography`, or `counting_system`, preventing programmatic verification of non-additive constraints.
3. **`validate.js` Schema Inconsistencies**: `ALLOWED.correction` restricts editable fields to `['year', 'place', 'toll', 'cause', 'confidence', 'source']`, omitting `source_id`, `tier`, and `tier_basis`. Staged corrections targeting `source_id` are rejected by validation.
4. **Asymmetric Non-Additive Validation**: `validate.js` accepts `(a_id, b_id)` without normalizing order (`min(a, b), max(a, b)`). Submitting `(b_id, a_id)` bypasses duplicate checks in staged contributions.
5. **Unreviewed Boilerplate in `seeds/ledger.json` Sources**: All 31 entries in `sources` contain copy-pasted `access_terms: "unreviewed"` and `license: "not asserted; facts cited, no text copied"`, failing the platform's provenance-first mandate.
6. **Unhandled `excluded` Block**: `ledger.json` includes an `excluded` array containing `piscataqua-span`, but `validate.js` and `tiers.js` possess no logic to handle or quarantine contributions referencing excluded entries.
