# Lend your agent an hour

Anyone with spare usage on an AI assistant (ChatGPT, Claude, Gemini, Grok, or any other) can put it to work on one
small, well-defined task from this board, hand back the result, and receive a receipt that records what their work
changed. The dataset grows the way an encyclopedia does: by small, cited edits that a person reviews and that are
never lost.

> Not a rescue service. Nothing here dispatches. Distress at sea: VHF channel 16 or the coast guard. Crisis: 988 (U.S.).

## The loop

1. **Pick a task** in `tasks.json` (or on the site's Lend page). Each is sized for one session: verify one figure,
   find one primary source, write one row, test one method.
2. **Open it in your agent.** The prompt pack (`node scripts/tasks.mjs prompt <id>`) is self-contained: the lab's
   three rules, the task, the inputs, the exact output shape, and the acceptance checks. The site offers one-click
   links that open ChatGPT, Claude, Grok or Perplexity with the prompt filled in; for others, paste it.
3. **Hand back the bundle.** The agent's last message is a JSON bundle (`bundle.schema.json`). On the site's Lend
   page, "Open as a pull request" opens GitHub with the file already filled in under `contributions/`; or send it by
   email to hello@thelifesavinglab.org; or, once the API is deployed, with one request: `POST /v1/bundles`. An agent that can fetch can also serve itself:
   `GET /v1/tasks` for the board and `GET /v1/tasks/<id>/prompt` for the pack.
4. **A person reviews it.** The same checks run at the API door, so a stored bundle has already passed them.
   `node scripts/tasks.mjs check <bundle>` runs the machine checks first (schema, PII,
   primary-source domains, no sums across rows, quotes under 25 words). A reviewer reads what is left, decides, and
   `node scripts/tasks.mjs receipt <bundle> --reviewer <handle> --decision accepted` writes a receipt.
   With the API deployed, `node scripts/tasks.mjs pull --api <url> --token <t>` writes every staged bundle into
   `contributions/`, and `receipt … --api <url> --token <t>` records the decision against the staged copy as well.
5. **The receipt is public.** `receipts/lend.json` records the task, the contributor's handle, the agent used, the bundle's
   SHA-256, the decision, and what changed in the next release. Contributors are credited by handle; nobody is ever
   named in the data itself.

## Why it compounds

- **Every task is a diff against a versioned dataset.** Contributions accumulate in git; nothing overwrites.
- **The board refills itself.** Tasks are generated from the data's own gaps (`verify` and `open` tags, the coverage
  matrix), and every accepted bundle may propose `next_tasks`, which a reviewer can promote to the board.
- **Prompt packs are versioned.** When reviewers see the same mistake twice, the pack is edited once and every later
  run is better. The pack version is recorded on each receipt.
- **Two agents, one task.** A `verify` task can be run by two different models. `node scripts/tasks.mjs agree <id>`
  compares every bundle returned for the task, field by field: agreement on a value keeps it, disagreement sends that
  field to a person, and the receipts record which. Independent agreement is cheap evidence.
- **Machine checks first, people last.** Reviewers spend their minutes on judgment, not on formatting.
- **Claims are leases, not locks.** `claim` holds a task for seven days so two people do not do the same work; it
  lapses by itself.
- **Credit is durable and specific.** A receipt says what changed, in which release, with a hash anyone can check.

## What an agent must never do

Invent a figure, a source, a page number or a quote. Sum figures across rows. Record a person's name, contact or
precise position. Report a `done` status without a primary source it actually opened. A bundle that says
`not-found` with a list of what was tried is a good result and earns a receipt.

## Files

| File | What |
| --- | --- |
| `tasks.json` | The board: open, claimed and done tasks, with inputs and acceptance checks. `needs: "browser"` marks a task that an assistant without a real browser cannot finish; `done_receipt` on an open task means one assistant already tried and its receipt says what was tried. |
| `bundle.schema.json` | The output an agent must return. |
| `../receipts/lend.json` | Every reviewed bundle, with its decision, the bundle's hash and what it changed. |
| `prompt-preamble.md` | The shared head of every prompt pack: the rules and the output shape. Versioned (v1.1: an assistant that cannot browse must return not-found rather than work from memory; v1.2 and v1.3: every field limit printed). |
| `example-bundle.json` | A real returned bundle: the WHO regional figures verified against the report on 15 Oct 2026. |
| `../scripts/tasks.mjs` | `list`, `prompt`, `claim`, `release`, `check`, `check-all`, `agree`, `receipt`, `promote`, `pull`. |
| `../contributions/` | Returned bundles, one file each, submitted by pull request. |
| `../estimates/` | The ledger the tasks refer to: every figure with its source, scope, grade and do-not-add rule. |

## The first four lent hours (15 Oct 2026)

Each was an independent agent with the prompt pack and web access only; each bundle passed the machine checks, was
read by a person's session, merged, and received a receipt (`receipts/lend.json`, `contributions/merged/`).

| Task | What came back |
| --- | --- |
| `verify-who-region-afr` | The WHO figure read blind matched the lab's own reading (66,000; 5.6 per 100,000); `agree` confirmed it. |
| `nonfatal-ratio-primary` | "4–5 non-fatal drownings per death" exists only in a press article that says "it is estimated"; no primary in 14 documents. Row retired; three counted ratios added. |
| `who-europe-9155-reconcile` | The 9,155 figure came from the same article, whose global total is a 2017 model and whose regional figures exceed it. Europe row now carries WHO's definition; Eurostat and WHO Europe rows added. |
| `setting-split-canada` | Seven setting shares for 2018–2022 and the 2022 total from Canada's 2026 snapshot; one pairing flagged for a visual check. |

What the runs taught the pack: assistants that cannot browse must say so (v1.1); field limits were too tight for a
thorough agent (v1.2); and the personal-data detector was reading WHO's 13-digit ISBN as a phone number, which would
have refused every WHO task. All fixed before an outsider met them.

## The next five (15 Oct 2026)

Same method: an independent agent, the prompt pack, web access only. Three came back partial and were merged; two came
back not-found with precise reasons, were given receipts, and left their tasks open with a `needs a person with a browser`
mark.

| Task | What came back |
| --- | --- |
| `setting-split-united-states` | The US setting split lives in CDC WONDER, which answers only an interactive session. The agent returned what primary reports print instead: CPSC's pool-and-spa count for children (379 in 2023), the Coast Guard's 365 boating drownings for 2024, the MMWR's exact 2022 total (4,509) and CDC's location-by-age statements (regraded C by the reviewer). The WONDER query is now a browser task. |
| `setting-split-new-zealand` | The 2025 WSNZ report's text gives tidal 14, rivers 17, offshore 3, inland still 9; Pools, Home and the all-sex Coast count sit in charts and a Dropbox PDF that refuse automated readers. Both printings of the total (78 in February, 79 by October) recorded. Nine rows; the PDF is a browser task. |
| `gbd-2017-franklin-s1-europe` | 9,155 is not in the Franklin 2020 main text, which prints no European figure; S1 is behind browser checks at PMC, BMJ and Europe PMC. The global figure was re-verified against the full text, the row now cites the DOI, and a companion rate row was added. |
| `uscg-rss-feed-address` | Not found: the feed handler refuses automated readers and the page's links are stripped in conversion, so the site id could not be read. The agent found a live District 7 GovDelivery feed; the watch now trials it and both ContentType values. |
| `leeway-values-piw-raft` | Not found: automated readers get the first 88,000 characters of the 1999 report, and Table 8-1 starts on p. 8-5. The agent mapped the report (section 8.3, Appendix B) and found the archive.org full text; both are now in the task's inputs. |

What these taught the pack and the tools: two more field limits were tripped (`do_not_add_to`, `source`), so every
limit is now printed in the pack (v1.3); an accepted not-found no longer closes its task; the board rebuild carries
receipt ids; and tasks that need a real browser are marked so an assistant that cannot browse picks another.

## Two more (15 Oct 2026, later)

| Task | What came back |
| --- | --- |
| `franklin-2020-rate-interval` | Both intervals are in the paper: 3.8–4.1 in the Abstract and the Results (with the UI label), 3.6–4.1 once in the Discussion. The row cites 3.8–4.1 and says why; the version of record is a browser task. |
| `new-zealand-activity-split-2025` | Swimming 15, craft 17, fishing from land 10, slips and falls 24, as printed; underwater and other recreation are chart-only and became gap rows. Six rows; the PDF task now covers them. |

Both tripped the `corrections.old`/`new` limit of 400 when correcting a note that was itself near 600, so those limits
now match the note's (v1.4). Eleven lent hours so far: 31 rows and 16 corrections accepted, 11 receipts, two tasks
left open with a receipt that says what was tried.
