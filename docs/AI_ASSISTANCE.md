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
4. Final review of docs and code — review queue now returns payloads; `/v1/review/queue` is GET-only; non-string ids
   are rejected; doc field names fixed (`published`). Not applied: its claim that `source_citation` does not exist
   (it is an export column). Full text in `receipts/gemini/pass4-final.md`.

A person must review this record before a release is called human-reviewed.

## Applied wisdom contract

The Lab's operational definition is: **wisdom is applied when it changes a decision**. AI output is not applied wisdom merely because it is fluent, novel, or agreed with by other models. An AI contribution becomes evidence of application only when a responsible human or organization can identify the decision before and after, explain the evidence and dissent, act within legitimate authority, and preserve what followed.

Keep these states separate in prompts, bundles, receipts and UI: exposure, understanding, decision change, authorized action, observed outcome, and independently reviewed benefit. AI may assemble evidence, identify contradictions, draft decision records, explore alternatives, and preserve memory. Humans retain responsibility for values, consent, local judgment, safety, authority, adoption, publication, deployment and repair. See [`APPLIED_WISDOM.md`](APPLIED_WISDOM.md).
