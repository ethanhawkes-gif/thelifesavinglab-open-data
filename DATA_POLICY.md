# Data policy

1. **Citation metadata only.** We store a figure as printed, its year, place, cause, confidence word, tier, and a citation (title, publisher, published date, optional https URL, access terms). We never store article, report or book text. Validation rejects any citation key other than `title, publisher, url, published, access_terms`, and caps every field.
2. **No personal data.** No names of people who died or survived, no next of kin, no contact details, no addresses, no coordinates of individuals, no IP addresses, no contributor identity. Audit events record a role (`public`, `reviewer`, `release-bot`), never a person.
3. **Aggregates, not cases.** A row is a published total or estimate. Single-incident rows (named ships) carry the inquiry's toll, not a passenger list.
4. **Sensitive topics are held for a human.** Self-harm–adjacent entries (e.g. the Piscataqua River Bridge) are excluded from public releases until a person applies safe-messaging review. `release.excluded` lists what was held and why.
5. **Never sum what the sources refused to sum.** The non-additive list is part of the dataset. The API exposes a check; consumers are expected to run it.
6. **No lives-saved claims.** A rescue is not a death and not a life saved. Nothing here may be used to state a number of lives saved.
7. **Corrections win over this file, but only through review.** A later edit replaces a figure only after a person reviews it; we never average an old and a new figure.
8. **Retention.** Declined or quarantined contributions are deleted from the staging store after 90 days (operator task; see `docs/OPERATIONS.md`). Their payload hash stays in the audit log.
