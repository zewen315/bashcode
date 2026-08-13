-- slug is free text, not a FK: problems live on disk
-- (bashcode-problems), never in Postgres — same convention as
-- submissions.slug in 0005_progress.sql.
-- parent_id is self-referential and technically allows unlimited
-- nesting, but the API enforces single-level threading (a reply's
-- parent must itself have parent_id IS NULL) — see
-- docs/decisions/0011-discussions.md.
CREATE TABLE comments (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug       TEXT NOT NULL,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id  BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_slug_created_at ON comments(slug, created_at DESC);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);

-- A signed value per (comment, user) rather than two separate
-- counters — upvote/downvote counts are computed live via
-- COUNT(*) FILTER (WHERE value = 1/-1) at read time.
CREATE TABLE comment_votes (
  comment_id BIGINT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value      SMALLINT NOT NULL CHECK (value IN (1, -1)),
  PRIMARY KEY (comment_id, user_id)
);
