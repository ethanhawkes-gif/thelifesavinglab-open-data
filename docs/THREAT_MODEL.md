# Threat model

Assets: integrity of released figures; the non-additive list; the reviewer token; contributors' privacy; the live
site's reputation (a separate system this repo must never touch).

| Threat | Vector | Control | Residual |
|---|---|---|---|
| Canonical tampering | API write | No canonical writes exist; releases come only from reviewed PRs; hashes in manifest | Compromised maintainer account |
| Fabricated or averaged figure | contribution / PR | citation required; non-additive check; two-maintainer rule for pair changes | Reviewer error |
| Personal data published | free text in contribution | allow-listed fields, PII detector -> quarantine, release test asserts no PII | Detector misses (names without markers); reviewer must read |
| Copyright | pasting source text | citation key allow-list, length caps, no body field | Long titles; reviewer check |
| Reviewer token theft / guessing | brute force, timing | >= 32 chars, digest comparison, Worker secret | No per-IP lockout in code — add a Cloudflare rate-limit rule |
| Storage exhaustion | contribution flood | 8 KB cap, idempotent by payload hash, pending cap -> 429 | Queue can be filled, blocking honest contributors — rate-limit rule + reviewer purge |
| CSV formula injection | spreadsheet export | leading `= + - @ |` tab, CR (after whitespace) prefixed with `'` | Non-Excel tools may still evaluate |
| ReDoS | crafted input | linear regexes; test caps 8 KB adversarial runtime at 100 ms | — |
| Info leak | stack traces | generic 500, no echo of internals | — |
| Misuse as emergency service | user confusion | header + README + OpenAPI notice: VHF 16 / coast guard / 988 | — |
| Harm via sensitive topics | bridge/self-harm entries | held out of releases pending safe-messaging review | — |
| Supply chain | npm | Worker has zero runtime dependencies; devDeps only; `npm audit` in CI | Dev tooling |
