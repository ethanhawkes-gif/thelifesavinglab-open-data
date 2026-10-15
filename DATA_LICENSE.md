# Data license

The compiled data in `seeds/`, `src/data/` and `dist/` (observation metadata, citation metadata, tier assignments,
structured tolls and the non-additive pair list) is dedicated to the public domain under
**CC0 1.0 Universal** — https://creativecommons.org/publicdomain/zero/1.0/legalcode

What that covers, and what it does not:

- The figures themselves are facts attributed to their sources. Citing a figure and a title is not a copy of the source.
- No source text is stored here. Each source keeps its own terms; `access_terms` records what has been reviewed
  (currently `unreviewed` for every source — see `docs/SOURCE_REVIEW.md`).
- The `reason` text on non-additive pairs is the Life-Saving Lab's own wording and is dedicated under CC0 with the rest.
- If you republish a figure, cite the original source named in `source_citation`, not this repository.

## The rest of the repository's data

- `estimates/` (the figures ledger, the toll layers, the decision tree, the register template), `tasks/` (the board,
  the prompt pack, returned bundles in `contributions/`), `receipts/lend.json` and `docs/briefs/` are released under
  **CC BY 4.0** — https://creativecommons.org/licenses/by/4.0/ — as the site states in its footer. Attribution:
  "The Life-Saving Lab, thelifesavinglab.org". Figures remain facts attributed to their sources; cite the source named
  in each row, not this repository.
- `watch/queue.json` and `watch/feed.json` hold links, dates and derived kinds only, under CC0 with the compiled data
  above; the linked reports keep their publishers' terms.
- Photographs under `site/src/img/` are © Ethan Hawkes and are not covered by either licence; ask before reuse.

Two licences in one repository is a choice still open to the maintainer: unifying on CC0 would make reuse simplest;
unifying on CC BY 4.0 would keep attribution. Until that is decided, the split above is the rule.
