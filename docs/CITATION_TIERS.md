# Citation tiers and confidence

Confidence words come from the chart: **counted**, **estimated**, **unrecorded**. Tiers say how strong the source is.

| Tier | Meaning | Rule `tiers-v2` (automatic, reviewer may override) |
|---|---|---|
| T1 | Filed count: register, inquiry, census, statistical report | `counted` and the source names an inquiry, commission, government, register, report, statistics, or a known agency / peer-reviewed venue |
| T2 | Agency or peer-reviewed estimate with a method | `estimated` and the source is WHO, ILO, IMO, IOM, CDC, CPSC, USLA, U.S. Coast Guard, or a journal/DOI |
| T3 | Historical or secondary reconstruction; counts resting on contemporary accounts | everything else that has a number |
| T4 | No census exists; the entry records an absence | `unrecorded` |

`tier_basis` on each row names the rule version. v1 marked every `counted` row T1; Gemini review (pass 1) showed that
put "contemporary accounts" (the Portland Gale) at T1. v2 fixes it.

**Toll kinds** (`toll_parsed.kind`): `count`, `range`, `approximate` (with qualifier), `rate` (per year), `disputed`
(an official and an estimated figure in one entry), `absence`, `not-a-toll` (e.g. a treaty threshold, a breakdown).
`unit` is `deaths` or `rescues`. A rescue is not a death and not a life saved.
