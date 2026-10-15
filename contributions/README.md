# Returned bundles

One file per returned bundle, named `<task-id>-<handle>.json`, matching `tasks/bundle.schema.json`. Open a pull request
with the file; CI runs `node scripts/tasks.mjs check` on it, and a reviewer writes the receipt. Bundles must contain no
names, contact details or precise positions. See `tasks/README.md`.

Once a bundle's rows and corrections are in the ledger, the maintainer moves the file to `merged/`: the checks would
otherwise flag its new rows as already existing. Receipts stay in `receipts/lend.json` either way.
