# Governance

- **Maintainers** merge pull requests and cut releases. At least one maintainer review is required on any change to `seeds/`, `migrations/` or `src/`; two for changes to the non-additive list, tier rules, or data policy.
- **Reviewers** hold the Worker's `REVIEW_TOKEN` and decide staged contributions. A decision never edits canonical data; acceptance means "open a PR for this".
- **Release** = a version bump in `seeds/release-meta.json`, `npm run build:data`, committed artifacts, and a git tag. The manifest hashes are the release's identity.
- **Disputes** about a figure are settled by the source, not by vote. Where sources disagree, both figures are kept as separate rows and paired as non-additive.
- **Stop rule.** Any maintainer may hold a release that might identify a person, carry a lives-saved claim, or mishandle a sensitive topic. A hold is lifted by a second maintainer, in writing, in the PR.
- The Life-Saving Lab program (people, dates, partners) is not governed here. This repository governs data and code only.
