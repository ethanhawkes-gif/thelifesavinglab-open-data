# Security policy

Report a vulnerability privately through GitHub's "Report a vulnerability" (Security Advisories) on this repository. Please do not open a public issue for security problems. We aim to acknowledge within 5 days.

In scope: the Worker (`src/`), migrations, build scripts, the published data (e.g. PII that slipped through).
Out of scope: thelifesavinglab.org (separate system), volumetric DoS, findings that need a leaked reviewer token.

Controls in this repository: input size cap (8 KB) and content-type check; strict allow-listed fields; PII and credential detector with quarantine; pending-queue cap (`MAX_PENDING`, default 500; returns 429); SHA-256 digest comparison for the reviewer token (>= 32 chars, Worker secret, never committed); append-only audit table enforced by SQL triggers; CSV formula neutralization; `nosniff`, `default-src 'none'` CSP, `no-referrer`; generic 500 responses. Threats and residual risks: `docs/THREAT_MODEL.md`.

Secrets: never commit `.dev.vars`, tokens, or D1 ids tied to production. CI should run `gitleaks detect` and `npm audit`.
