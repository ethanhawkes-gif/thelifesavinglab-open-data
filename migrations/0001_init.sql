-- Life-Saving Lab open data: schema v1. Canonical rows are loaded only from a released, hashed artifact.
-- No table stores personal data: no names, emails, IPs, or free-text about individuals.
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 2 AND 63),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('agency','inquiry','ngo','academic','press','other'))
);
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 2 AND 63),
  citation TEXT NOT NULL CHECK (length(citation) <= 500),
  organization_id TEXT REFERENCES organizations(id),
  url TEXT CHECK (url IS NULL OR url LIKE 'https://%'),
  access_terms TEXT NOT NULL DEFAULT 'unreviewed',
  license TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS datasets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  data_license TEXT NOT NULL,
  version TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS measures (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  time_window TEXT,
  population TEXT,
  geography TEXT,
  counting_system TEXT
);
CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 2 AND 63),
  dataset_id TEXT NOT NULL REFERENCES datasets(id),
  measure_id TEXT REFERENCES measures(id),
  label TEXT NOT NULL,
  year TEXT NOT NULL,
  place TEXT NOT NULL,
  toll TEXT NOT NULL,
  cause TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('counted','estimated','unrecorded')),
  tier TEXT NOT NULL CHECK (tier IN ('T1','T2','T3','T4')),
  tier_basis TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources(id)
);
CREATE TABLE IF NOT EXISTS non_additive_pairs (
  a_id TEXT NOT NULL REFERENCES observations(id),
  b_id TEXT NOT NULL REFERENCES observations(id),
  reason TEXT NOT NULL,
  PRIMARY KEY (a_id, b_id),
  CHECK (a_id <> b_id)
);
CREATE TABLE IF NOT EXISTS releases (
  version TEXT PRIMARY KEY,
  dataset_id TEXT NOT NULL REFERENCES datasets(id),
  released TEXT NOT NULL,
  json_sha256 TEXT NOT NULL CHECK (length(json_sha256) = 64),
  csv_sha256 TEXT NOT NULL CHECK (length(csv_sha256) = 64)
);
-- Staged contributions: the public API writes only here. payload has passed validation; pii lists detector hits.
CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('staged','quarantined','accepted','declined')),
  payload TEXT NOT NULL CHECK (length(payload) <= 8192),
  payload_sha256 TEXT NOT NULL CHECK (length(payload_sha256) = 64),
  pii TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '[]',
  submitted_at TEXT NOT NULL,
  decided_at TEXT,
  decided_in_release TEXT
);
CREATE INDEX IF NOT EXISTS contributions_status ON contributions(status, submitted_at);
-- Lineage: which contribution or import produced which canonical row in which release.
CREATE TABLE IF NOT EXISTS lineage (
  observation_id TEXT NOT NULL,
  release_version TEXT NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('canon-import','contribution')),
  contribution_id TEXT REFERENCES contributions(id),
  PRIMARY KEY (observation_id, release_version)
);
-- Append-only audit: actor is a role, never a person.
CREATE TABLE IF NOT EXISTS audit_events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('public','reviewer','release-bot')),
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  detail_sha256 TEXT
);
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END;
