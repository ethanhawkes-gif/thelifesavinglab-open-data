-- Returned bundles from "Lend your agent an hour": staged for a person to review. Never canonical.
-- Bundles that fail the machine checks (including any personal data) are refused at the door and never stored.
CREATE TABLE IF NOT EXISTS bundles (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL CHECK (length(task_id) BETWEEN 3 AND 81),
  status TEXT NOT NULL CHECK (status IN ('staged','accepted','declined','needs-work')),
  handle TEXT NOT NULL CHECK (length(handle) <= 40),
  agent TEXT NOT NULL CHECK (length(agent) <= 80),
  bundle_status TEXT NOT NULL CHECK (bundle_status IN ('done','partial','not-found')),
  payload TEXT NOT NULL CHECK (length(payload) <= 65536),
  payload_sha256 TEXT NOT NULL CHECK (length(payload_sha256) = 64),
  warnings TEXT NOT NULL DEFAULT '[]',
  preamble_version TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  decided_at TEXT,
  receipt_id TEXT
);
CREATE INDEX IF NOT EXISTS bundles_status ON bundles(status, submitted_at);
CREATE INDEX IF NOT EXISTS bundles_task ON bundles(task_id);
