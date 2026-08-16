-- slug is free text, not a FK: problems live on disk
-- (bashcode-problems), never in Postgres — same convention as
-- submissions.slug (0005_progress.sql) and comments.slug
-- (0006_comments.sql).
--
-- A signed value per (slug, user) rather than two separate counters —
-- upvote/downvote counts are computed live via COUNT(*) FILTER (WHERE
-- value = 1/-1) at read time, same shape as comment_votes.
CREATE TABLE problem_votes (
  slug    TEXT NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value   SMALLINT NOT NULL CHECK (value IN (1, -1)),
  PRIMARY KEY (slug, user_id)
);
CREATE INDEX idx_problem_votes_slug ON problem_votes(slug);
