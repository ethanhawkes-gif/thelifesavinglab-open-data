# Operations: setup, migrations, rollback

**Local.** `npm ci && npm run check && npx wrangler dev`.

**Staging (zero production effect).** This Worker is `lsl-open-data` with no routes and `workers_dev = false`;
it cannot serve thelifesavinglab.org. To stage: `wrangler d1 create lsl-open-data-staging`, put the id in
`wrangler.toml`, `wrangler d1 migrations apply lsl-open-data-staging --remote`, `wrangler secret put REVIEW_TOKEN`,
then set `workers_dev = true` (or add a route on a domain you own) and `wrangler deploy`. Not done in this repository's
first release.

**Migrations.** `0001_init.sql` (canonical tables, contributions, audit) and `0002_bundles.sql` (returned bundles from the task board). Append-only numbered files in `migrations/`. Never edit an applied migration; add `0002_…`. Every
migration must apply on an empty database and on the previous release's database (tests run them on `node:sqlite`).
Destructive changes (drop/rename) need a two-step migration: add new, backfill, release, then drop in a later release.

**Rollback.** Data: re-deploy the previous git tag; its bundled release and hashes are self-contained.
Code: `wrangler rollback` to the previous version. D1: export before each migration
(`wrangler d1 export lsl-open-data-staging --remote --output backup-<date>.sql`); to roll back, restore that export
into a fresh database and re-point the binding. Staged contributions are not canonical; losing them loses only
pending suggestions, never released data.

**Retention.** Monthly: delete `declined` and `quarantined` contributions older than 90 days (audit rows remain).
