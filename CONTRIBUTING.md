# Contributing

Two ways in, both reviewed by a person before anything changes.

**Data.** `POST /v1/contributions` with one of `correction`, `new_observation`, `source_metadata`, `non_additive_pair` (schema in `/v1/openapi.json`). Or open a pull request editing `seeds/ledger.json`. Every change needs a citation: title, publisher, and ideally an https link and date. Do not paste source text. Do not include names or contact details of anyone, including yourself. Items with personal data are quarantined, and a reviewer will strip or decline them.

**Code.** Fork, branch, `npm run check` must pass. Every function you add needs a test with one ordinary case and one edge case. Keep the Worker dependency-free.

**AI assistance** is welcome for computing, searching, drafting and attacking a draft. A person must review and own every change, and the PR description says which models helped and what the person changed (see `docs/AI_ASSISTANCE.md`).

What gets declined: averaged or summed figures that the non-additive list forbids; lives-saved claims; uncited figures; anything that identifies a person.
