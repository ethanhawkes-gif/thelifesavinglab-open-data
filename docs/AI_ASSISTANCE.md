# AI assistance record

Release 0.1.0 was built by an AI agent (Claude) under a human owner's instruction, with four advisory review passes
by Google Gemini (model `gemini-3.8-flash-high` via Antigravity). Gemini output is kept verbatim under
`receipts/gemini/` and was treated as advice, not fact. What each pass changed:

1. Architecture/evidence model — found that `counted` was always T1 (fixed: tiers-v2) and that tolls were flat
   strings (fixed: `toll_parsed`).
2. Security review — first attempt blocked by the provider's filter; rephrased run found the token comparison could
   leak length (fixed: digest comparison), unbounded queue growth (fixed: pending cap, 429), CSV bypass with leading
   whitespace and `|` (fixed), obfuscated emails (fixed), and others recorded in `docs/THREAT_MODEL.md`.
3. Source/licensing review — found truncated source ids (fixed: word-boundary slugs). Its per-source reuse-terms table
   is in `docs/SOURCE_REVIEW.md`, marked unverified.
4. Final review of docs and code — see `receipts/gemini/pass4-final.md`.

A person must review this record before a release is called human-reviewed.
