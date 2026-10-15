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
3. **Hand back the bundle.** The agent's last message is a JSON bundle (`bundle.schema.json`). Submit it by pull
   request (`contributions/<task-id>-<handle>.json`), by email to hello@thelifesavinglab.org, or, once the API is
   deployed, with one request: `POST /v1/bundles`. An agent that can fetch can also serve itself:
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
| `tasks.json` | The board: open, claimed and done tasks, with inputs and acceptance checks. |
| `bundle.schema.json` | The output an agent must return. |
| `../receipts/lend.json` | Every reviewed bundle, with its decision, the bundle's hash and what it changed. |
| `prompt-preamble.md` | The shared head of every prompt pack: the rules and the output shape. Versioned. |
| `example-bundle.json` | A real returned bundle: the WHO regional figures verified against the report on 15 Oct 2026. |
| `../scripts/tasks.mjs` | `list`, `prompt`, `claim`, `release`, `check`, `check-all`, `agree`, `receipt`, `promote`, `pull`. |
| `../contributions/` | Returned bundles, one file each, submitted by pull request. |
| `../estimates/` | The ledger the tasks refer to: every figure with its source, scope, grade and do-not-add rule. |
