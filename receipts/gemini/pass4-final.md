<!-- agy-gemini-run: label=lsl-pass4-final model_requested=gemini-3.8-flash-high conversation_id=8f0ac929-5674-4c78-9300-da7dcd1c245c at=2026-10-13T13:11:01.790Z tokens={"input_tokens":22465,"output_tokens":56438,"thinking_tokens":54801,"cache_read_tokens":0,"total_tokens":78903} — ADVISORY MODEL OUTPUT, not verified fact -->

### 1. Release Blocker: Review Queue Query Omits Contribution Payloads
* **File:** [`src/worker.js`](file:///projects/thelifesavinglab-open-data/src/worker.js#L49)
* **Problem:** Reviewers fetching `/v1/review/queue` receive metadata only (`payload_sha256`, `notes`, etc.) without `payload`. Because there is no single-item GET endpoint either, reviewers cannot inspect submitted contributions before deciding.
* **Replacement:**
```javascript
    const { results } = await env.DB.prepare("SELECT id,kind,status,payload,payload_sha256,pii,notes,submitted_at FROM contributions WHERE status IN ('staged','quarantined') ORDER BY submitted_at LIMIT 100").all();
```

---

### 2. Code Defect & Doc Contradiction: Review Endpoint Method Handling & Docs
* **Files:** [`src/worker.js`](file:///projects/thelifesavinglab-open-data/src/worker.js#L64), [`README.md`](file:///projects/thelifesavinglab-open-data/README.md#L37)
* **Problem:** A `POST` to `/v1/review/queue` routes to `review(request, env, 'queue')` and returns `200` with the queue instead of `405 Method Not Allowed`. Meanwhile, [`README.md`](file:///projects/thelifesavinglab-open-data/README.md) claims `GET/POST` works across both `/v1/review/queue` and `/v1/review/{id}`, but `/v1/review/{id}` returns `405` on `GET`.
* **Replacement in [`src/worker.js`](file:///projects/thelifesavinglab-open-data/src/worker.js#L64):**
```javascript
  if (path === '/v1/review/queue') return m === 'GET' ? review(request, env, 'queue') : fail(405, 'method not allowed');
  if (path.startsWith('/v1/review/')) return m === 'POST' ? review(request, env, path.slice(11)) : fail(405, 'method not allowed');
```
* **Replacement in [`README.md`](file:///projects/thelifesavinglab-open-data/README.md#L37):**
```markdown
| GET | `/v1/review/queue` | list pending contributions (bearer token) |
| POST | `/v1/review/{id}` | record reviewer decision: accepted or declined (bearer token) |
```

---

### 3. Code Defect: Non-String Target IDs Bypass Validation into Quarantine
* **File:** [`src/lib/validate.js`](file:///projects/thelifesavinglab-open-data/src/lib/validate.js#L35)
* **Problem:** `String(payload[k] ?? '')` coerces non-string types like boolean `true` or numbers (`123`) to strings, passing `ID.test()`. Because `knownIds` does not contain them, they enter `needsQuarantine` without adding to `errors`, causing malformed payloads to be accepted (`202 quarantined`) rather than rejected (`400`).
* **Replacement:**
```javascript
    if (typeof payload[k] !== 'string' || !ID.test(payload[k])) errors.push(`${k}: invalid id`);
```

---

### 4. Doc Contradiction: Citation Field Name (`date` vs `published`)
* **Files:** [`CONTRIBUTING.md`](file:///projects/thelifesavinglab-open-data/CONTRIBUTING.md#L5), [`DATA_POLICY.md`](file:///projects/thelifesavinglab-open-data/DATA_POLICY.md#L3)
* **Problem:** Docs instruct contributors to provide `date`, but [`src/lib/validate.js`](file:///projects/thelifesavinglab-open-data/src/lib/validate.js) enforces strict allow-listing (`CITATION_KEYS = ['title', 'publisher', 'url', 'published', 'access_terms']`). Valid submissions following docs will be rejected with `citation.date: not allowed (metadata only)`.
* **Replacement in [`CONTRIBUTING.md`](file:///projects/thelifesavinglab-open-data/CONTRIBUTING.md#L5):**
```markdown
Every change needs a citation: title, publisher, and ideally an https link and published date (field: `published`).
```
* **Replacement in [`DATA_POLICY.md`](file:///projects/thelifesavinglab-open-data/DATA_POLICY.md#L3):**
```markdown
1. **Citation metadata only.** We store a figure as printed, its year, place, cause, confidence word, tier, and a citation string (title, publisher, published, optional https URL, access terms). Validation rejects any citation key other than `title, publisher, url, published, access_terms`, and caps every field.
```

---

### 5. Overstated Authority/Capability: Reviewers "Strip" Personal Data
* **File:** [`CONTRIBUTING.md`](file:///projects/thelifesavinglab-open-data/CONTRIBUTING.md#L5)
* **Problem:** Claims a reviewer will "strip or decline" quarantined contributions. The API only supports setting `decision` to `accepted` or `declined`; there is no stripping/redaction capability in the code.
* **Replacement:**
```markdown
Items with personal data are quarantined, and a reviewer will decline them or omit personal data when drafting the pull request.
```

---

### 6. Doc Contradiction: Non-Existent Field Name in Data License
* **File:** [`DATA_LICENSE.md`](file:///projects/thelifesavinglab-open-data/DATA_LICENSE.md#L12)
* **Problem:** Instructs re-publishers to credit `source_citation`, but observation records in the code and schema use the field name `source`.
* **Replacement:**
```markdown
- If you republish a figure, cite the original source named in `source`, not this repository.
```

---

### 7. Doc Ambiguity: Queue Capacity vs HTTP Status
* **File:** [`SECURITY.md`](file:///projects/thelifesavinglab-open-data/SECURITY.md#L9)
* **Problem:** Describes the queue limit as "pending-queue cap (429)", which conflates HTTP status 429 with the actual queue capacity (default `500` via `MAX_PENDING`).
* **Replacement:**
```markdown
Controls in this repository: input size cap (8 KB) and content-type check; strict allow-listed fields; PII and credential detector with quarantine; pending-queue cap (500 items, returning 429); SHA-256 digest comparison for the reviewer token (>= 32 chars, Worker secret, never committed); append-only audit table enforced by SQL triggers; CSV formula neutralization; `nosniff`, `default-src 'none'` CSP, `no-referrer`; generic 500 responses. Threats and residual risks: `docs/THREAT_MODEL.md`.
```
