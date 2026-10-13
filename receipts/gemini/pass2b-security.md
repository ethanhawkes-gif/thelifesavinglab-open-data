<!-- agy-gemini-run: label=lsl-pass2b-security model_requested=gemini-3.8-flash-high conversation_id=bd97a526-6e93-4f33-972c-dfc157e96c1d at=2026-10-13T13:06:13.507Z tokens={"input_tokens":20240,"output_tokens":12947,"thinking_tokens":10426,"cache_read_tokens":0,"total_tokens":33187} — ADVISORY MODEL OUTPUT, not verified fact -->

### 1. Timing Leak in Bearer Token Comparison (Critical)
**Weakness:** In `timingSafeEqual`, the loop runs up to `Math.max(ea.length, eb.length)`. Varying the length of the submitted token leaks the exact character length of `env.REVIEW_TOKEN`. In addition, JS variable-time operations leak timing information.  
**Fix (`src/lib/hash.js`):** Hash both inputs to fixed 32-byte digests before comparing with the Web Crypto API.
```javascript
export async function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(a)),
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(ha, hb);
}
```
*(In `src/worker.js`, mark `reviewerOk` as `async` and await `timingSafeEqual`)*.

---

### 2. Unbounded Storage Growth & Staging Queue Exhaustion (High)
**Weakness:** `POST /v1/contributions` is unauthenticated and completely unthrottled. An attacker can repeatedly post distinct valid payloads to consume D1 storage quota, exhaust worker write allowances, and flood the human review queue.  
**Fix (`src/worker.js`):** Add an IP rate limit or enforce a hard cap on pending contributions before accepting new ones.
```javascript
const pending = await env.DB.prepare("SELECT count(*) AS c FROM contributions WHERE status IN ('staged','quarantined')").first('c');
if ((pending ?? 0) >= 1000) return fail(429, 'staging queue full; submissions temporarily paused');
```

---

### 3. Deeply Nested JSON & Prototype Key Injection (High)
**Weakness:** A payload of 8KB can contain hundreds of nested arrays/objects `[[[[...]]]]` or `{"__proto__": ...}` keys. While `detectPII` stops at depth 8, `classifyContribution` still returns `'quarantined'`, and the subsequent call to `canonicalJSON(payload)` blows the V8 call stack (500 crash). `__proto__` can also pollute prototypes or cause `canonicalJSON` to access `Object.prototype`.  
**Fix (`src/worker.js`):** Reject dangerous prototype keys and excessive object nesting directly during JSON parsing.
```javascript
let depth = 0;
try {
  payload = JSON.parse(raw, function(key, val) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') throw new Error('disallowed key');
    return val;
  });
} catch { return fail(400, 'invalid JSON structure'); }
const getDepth = (o) => (o && typeof o === 'object') ? 1 + Math.max(0, ...Object.values(o).map(getDepth)) : 0;
if (getDepth(payload) > 6) return fail(400, 'payload hierarchy too deep');
```

---

### 4. Regular Expression Backtracking (ReDoS) (Medium-High)
**Weakness:** In `src/lib/pii.js`, `named_person_marker` uses `\b(?:victim|deceased|survivor|patient|next of kin)\s*(?:name)?\s*[:=]/i`. Adjacent unbounded `\s*` with an optional intermediate token causes catastrophic polynomial backtracking when evaluated against long strings of whitespace lacking a trailing `:` or `=`.  
**Fix (`src/lib/pii.js`):** Disallow overlapping whitespace loops and anchor word boundaries.
```javascript
['named_person_marker', /\b(?:victim|deceased|survivor|patient|next of kin)(?:\s+name)?\s*[:=]/i],
```

---

### 5. CSV Formula Injection Bypass via Whitespace and Pipes (Medium)
**Weakness:** `csvEscape` checks `/^[=+\-@\t\r]/.test(s)`. Spreadsheet engines (Excel, LibreOffice) strip leading spaces, recognize BOM (`\uFEFF`), and execute formulas using pipes (DDE links). Strings like `  =1+1` or `|'cmd'!'/C calc'!A0` bypass the check and trigger formula execution when opened.  
**Fix (`src/lib/export.js`):** Neutralize dangerous characters even when preceded by whitespace or BOM, and include `|` and `%`.
```javascript
export function csvEscape(v) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[\s\uFEFF]*[=+\-@\t\r|%]/.test(s)) s = "'" + s.trimStart();
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
```

---

### 6. Gaps in Personal-Data (PII) Detector (Medium)
**Weakness:** `detectPII` relies on strict formatting that fails on obfuscation and standard identifiers:
- Obfuscated emails: `"jane.doe [at] gmail [dot] com"`, `"john(at)example.org"`, `"alice AT domain DOT com"`
- Unlabeled individuals and titles: `"Officer John Smith"`, `"Dr. Jane Doe"`, `"Informant: Alex"`
- Identifiers: IPv4/IPv6 addresses (`"192.168.1.10"`), international phone formats (`"+44 20 7946 0991"`).  
**Fix (`src/lib/pii.js`):** Add rules catching obfuscated emails, IP addresses, and honorific personal names.
```javascript
PATTERNS.push(
  ['email_obfuscated', /\b[A-Z0-9._%+-]+(?:\s*\[?at\]?|\s*@\s*)[A-Z0-9.-]+(?:\s*\[?dot\]?|\s*\.\s*)[A-Z]{2,}\b/i],
  ['ip_address', /\b(?:\d{1,3}\.){3}\d{1,3}\b|\b(?:[a-f0-9]{1,4}:){7}[a-f0-9]{1,4}\b/i],
  ['person_title', /\b(?:mr|mrs|ms|dr|officer|captain)\.?\s+[A-Z][a-z]+\b/i]
);
```

---

### 7. Sensitive-Topic and Distress Message Handling (Medium)
**Weakness:** `self_harm_detail` in `pii.js` only catches `"suicide method"` and `"how to kill/drown myself/yourself"`. If an in-crisis individual submits a distress message (`"I want to die"`, `"goodbye note"`, or maritime `"MAYDAY MAYDAY"`), it is quietly stored in D1 as `quarantined` with an asynchronous 202 response, delaying life-saving assistance.  
**Fix (`src/worker.js` / `src/lib/validate.js`):** Intercept acute distress phrases immediately, reject storage, and return crisis resources.
```javascript
const DISTRESS_RE = /\b(?:mayday|distress|sos|kill myself|suicide|end my life|want to die)\b/i;
if (DISTRESS_RE.test(raw)) {
  return fail(400, 'Immediate distress detected. Do not use this API for emergencies.', {
    emergency: 'VHF Ch 16 / 911',
    crisis_support: 'Suicide & Crisis Lifeline: call/text 988 (US/CA) or visit findahelpline.com'
  });
}
```

---

### 8. Verbatim Text / Copyrighted Content in Citation Metadata (Medium)
**Weakness:** `validateCitation` allows `title` up to 300 chars, `access_terms` up to 300 chars, and `reason` up to 600 chars without line restrictions. Contributors can paste multi-sentence copyrighted excerpts, article abstracts, or whole quotes into these metadata fields.  
**Fix (`src/lib/validate.js`):** Forbid newlines, shorten citation metadata limits, and reject quote blocks.
```javascript
function strClean(v, max) { return typeof v === 'string' && !/[\r\n]/.test(v) && v.trim().length > 0 && v.length <= max; }
// In validateCitation():
if (!strClean(c.title, 150) || /^["'].*["']$/.test(c.title)) errors.push('citation.title: single-line title only, <=150 chars, no quote blocks');
if (c.access_terms && !strClean(c.access_terms, 100)) errors.push('citation.access_terms: <=100 chars, single line');
```

---

### 9. Overly Permissive CORS and Missing Cache Headers on Sensitive Endpoints (Low-Medium)
**Weakness:** `BASE_HEADERS` unconditionally applies `'access-control-allow-origin': '*'`. This allows malicious websites to probe authenticated `/v1/review/*` endpoints via reviewer browsers. Additionally, export endpoints `/v1/export.*` do not specify `Cache-Control`, causing ambiguous intermediary caching.  
**Fix (`src/worker.js`):** Restrict CORS on review routes and explicitly set immutable caching for immutable exports.
```javascript
// In handle() for reviewer paths:
if (path.startsWith('/v1/review/')) extraHeaders['access-control-allow-origin'] = env.REVIEW_ORIGIN || 'null';
// For export endpoints:
case '/v1/export.json': return new Response(ex.json, { headers: { ...BASE_HEADERS, 'cache-control': 'public, max-age=31536000, immutable', 'content-type': 'application/json; charset=utf-8' } });
```

---

### 10. Information & Configuration Leakage in Error Responses (Low)
**Weakness:** `fail(503, 'staging store not configured')` discloses backend configuration state. `checkTarget` in `validate.js` reflects unverified arbitrary IDs into `needsQuarantine` (`unknown id ${payload[k]}`), echoing untrusted input back in HTTP responses.  
**Fix (`src/lib/validate.js` & `src/worker.js`):** Mask internal setup messages and avoid reflecting input.
```javascript
// In worker.js:
if (!env.DB) return fail(503, 'service unavailable');
// In validate.js:
else if (!knownIds.has(payload[k])) needsQuarantine.push(`${k}: referenced identifier does not exist in release`);
```
