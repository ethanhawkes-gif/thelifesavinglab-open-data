# The Life-Saving Lab · open data

Everything here is free to reuse with attribution (CC BY 4.0 for data and text; the sources keep their own licences). A person reads every proposed change. Nothing is published until a person merges it.

## Files

| File | What it is |
| --- | --- |
| `ledger.json` / `ledger.csv` | Every figure the site uses, one row each, with its source, scope, year, grade and the rule for what it must not be added to. |
| `toll.json` | The components of the global toll as layers with a low and a high, and the method for the floor and the ceiling. |
| `tree.json` | The decision tree: questions, options and leaves with graded measures, what to count, and the adopter each measure is written for. |
| `register-template.csv` | The incident register: the columns a harbor, a club or a station could fill in after any event, fatal or not. |

## Ledger row

| Field | Meaning |
| --- | --- |
| `id` | Stable slug. Never reused. A retired row keeps its id with `retired: <date>` in `note`. |
| `figure` | The number as the source prints it, with its interval if one is printed. |
| `low`, `high` | Numeric bounds used by charts. Equal when the source prints a point. `null` when nothing can be drawn. |
| `unit` | deaths, deaths per 100,000, share, ratio, lives saved, measures, definition, milestone. |
| `year` | The year the figure describes, not the year it was published. |
| `scope` | What is counted and what is left out, in words. |
| `geography` | Global, a region, a country, a place. |
| `category` | `core` (the modeled unintentional count), `excluded` (real deaths the core leaves out), `range` (sources disagree), `unknown` (no series), `who-drowns`, `prevention`, `rescue`, `local`, `context`, `gap`. |
| `source`, `url` | Who said it and where. |
| `grade` | A primary official data or model output · B peer-reviewed analysis · C press, secondary summary or an organisation's own statement · D lab judgment, stated as such, with the task that retires it. |
| `do_not_add_to` | The rule. Which rows this one overlaps, and what combining it would require stating. |
| `note` | Anything a reader needs before citing it. |
| `tags` | Comma-separated. `verify` means a grade-C row that should be checked against its primary before anyone cites it. `open` means a task. |
| `last_checked` | ISO date. |

## The three rules

1. **No figure is summed or averaged across rows** unless a row states the overlap assumption and names the rows it combines. The toll's floor and ceiling do this in `toll.json`, in the open.
2. **Grades describe provenance, not truth.** A grade-A point estimate with no printed interval is not more certain than a grade-B estimate with one.
3. **Unknown is drawn as unknown**, never as zero and never as a guess.

## Incident register (v0)

The register is the pilot track that feeds a database good enough for prediction. A row is one event, fatal or not. Fill what you know; leave the rest blank; never guess a field.

| Column | Values |
| --- | --- |
| `event_id` | Your own id. |
| `date`, `time_local` | ISO date; 24-hour time. |
| `place` | A named place. Coordinates if you have them. |
| `water` | sea-coast · harbor-river · lake · pool · home · flood · other |
| `activity` | swimming · surfing · paddling · boating-recreational · fishing-commercial · working · ferry-passenger · crossing · on-foot · vehicle · other |
| `vessel_type`, `vessel_length_m` | If a vessel was involved. |
| `persons_involved` | Count. |
| `age_band` | 0-4 · 5-14 · 15-29 · 30-49 · 50-69 · 70+ |
| `sex` | m · f · unknown |
| `pfd_worn` | yes · no · unknown |
| `alcohol_suspected` | yes · no · unknown |
| `water_temp_c`, `air_temp_c` | Numbers. |
| `wind_sea_state` | Words or Beaufort. |
| `minutes_alarm_to_reach` | From the first call to reaching the person. |
| `who_responded` | Coast Guard · harbormaster · bystander · lifeguard · fire · other |
| `outcome` | rescued-unharmed · rescued-injured · non-fatal-drowning · fatal · missing |
| `source` | Who recorded it. |
| `confidence` | high · medium · low |

A register with 200 honest rows from one harbor is worth more to prediction than a global estimate with no interval. That is the bet.
