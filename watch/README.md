# The watch

Reported drownings, one at a time, read by a person.

The ledger holds yearly estimates. The register holds events. The watch is where events come from: public feeds,
read every hour by a scheduled job, filtered for reports that look like a drowning, a search, a capsize or a rescue,
and queued for a person to read. Nothing here counts anything. A report is a report until a person turns it into a
register row.

> Not a rescue service. The watch reads news after the fact. Distress at sea: VHF channel 16 or the coast guard.
> Crisis: call or text 988 (U.S.).

## What is stored

A report is a link, a source, a date, a derived kind (`search-underway`, `capsize`, `rescue`, …), a stage, and a
hash of the headline used only to spot the same story twice. **No headline text, no summary, no names.** Reviewers
follow the link to read the report. If the publisher's own text trips the PII detector (`src/lib/pii.js`), the report
is marked `held` and never appears in the public feed.

## Files

| File | Written by | What |
| --- | --- | --- |
| `sources.json` | people | The feeds, with `enabled` and a note where a feed address is unconfirmed. |
| `keywords.json` | people | Include patterns (each mapped to a kind) and exclude phrases. |
| `queue.json` | the job | Every report seen, with its stage. Bounded; items a person has finished with fall off first. |
| `feed.json` | the job | The newest unread reports, for a site to show. Never includes held items. |
| `register.csv` | reviewers | Register rows written from reports, one event per line, in the lab's 24-column format. |

## Stages

`reported` → `read` → `row-written` → `published`, or `matched` (same event as another report) or `dismissed`.

```sh
node scripts/watch.mjs --dry-run                      # see what a run would add, without writing
node scripts/watch-review.mjs list --stage reported   # what is waiting
node scripts/watch-review.mjs read <id>
node scripts/watch-review.mjs row <id> --water sea-coast --activity swimming --outcome missing --place "Maui" --who "Coast Guard"
node scripts/watch-review.mjs dismiss <id> --note "a film review"
```

`row` refuses anything that looks like a name, a precise position or a contact, and places are recorded at town
level or coarser. A register row never names a person.

## The schedule

`.github/workflows/watch.yml` runs hourly and commits `queue.json` and `feed.json` to `main` when they change.
Run it by hand from the Actions tab (workflow_dispatch). It never fails on one bad source: each run records per-source
`ok` or `failed` in `queue.json → runs`, and a source that fails for a week is a problem to fix, not an outage.

## What a report becomes

A register row (`register.csv`) feeds the Life-Saving Lab's register: water, activity, outcome, minutes to reach,
who responded, source, confidence. Two hundred careful rows from one coast are worth more to prediction than a global
estimate with no interval. Rows reach a release through the normal path: pull request, review, `npm run check`.
