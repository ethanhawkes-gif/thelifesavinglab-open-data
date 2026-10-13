# Privacy and PII guardrails

Detector (`src/lib/pii.js`) flags: email (plain and `[at]`/`[dot]` obfuscated), phone numbers, U.S. SSNs, street
addresses, high-precision coordinates, date-of-birth phrases, person markers (`victim:`, `next of kin =`, …),
credentials (API keys, GitHub/OpenAI/AWS token shapes), and explicit self-harm method text. Keys and values are scanned
to a depth of 8; deeper input is flagged.

A hit never publishes and never silently drops: the contribution is stored as `quarantined` with the hit list, so a
reviewer sees why. The detector is deliberately conservative; it does not recognise bare personal names. Reviewers
must read every quarantined and staged item before accepting.

The release test (`tests/data.test.mjs`) fails the build if any released field trips the detector or exceeds 200
characters (a copied-text tripwire). Contributor identity is never requested or stored; attribution, if wanted,
happens in the pull request, under the contributor's own control.

**Distress.** This API is not monitored. If a submission contains danger phrases (mayday, man overboard, sinking,
crisis language), the Worker stores nothing and answers at once with the coast guard / VHF 16 / 911 / 988 notice.
This also blocks legitimate data contributions that use those words (for example about the bridge entry); those go
by pull request, where a person handles them under safe-messaging review.
