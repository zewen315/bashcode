-- Solved/attempted are derived from this, not separate tables — a
-- query over submissions, not a second source of truth that could
-- drift out of sync. slug is free text, not a FK: problems live on
-- disk (bashcode-problems), never in Postgres.
CREATE TABLE submissions (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug         TEXT NOT NULL,
  verdict      TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Makes /progress/import idempotent (ON CONFLICT DO NOTHING) if a
  -- device's local data ever gets uploaded more than once.
  UNIQUE (user_id, slug, verdict, submitted_at)
);
CREATE INDEX idx_submissions_user_id_submitted_at ON submissions(user_id, submitted_at DESC);
CREATE INDEX idx_submissions_user_id_slug ON submissions(user_id, slug);

-- A bookmark list, deliberately separate from submission history —
-- see docs/decisions/0007-notifications-and-profile-widgets.md's
-- "Reset coding history" note for why the two are kept distinct.
CREATE TABLE starred_problems (
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  starred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slug)
);
