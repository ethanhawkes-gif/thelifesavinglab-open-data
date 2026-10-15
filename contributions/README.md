# Returned bundles

One file per returned bundle, named `<task-id>-<handle>.json`, matching `tasks/bundle.schema.json`. Open a pull request
with the file; CI runs `node scripts/tasks.mjs check` on it, and a reviewer writes the receipt. Bundles must contain no
names, contact details or precise positions. See `tasks/README.md`.
