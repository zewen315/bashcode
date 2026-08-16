-- slug is free text, not a FK — same convention as submissions.slug
-- (0005_progress.sql), comments.slug (0006_comments.sql), and
-- problem_votes.slug (0012_problem_votes.sql): problems live on disk
-- (bashcode-problems), never in Postgres.
--
-- One row per successful tweet, not per attempt — the posting script
-- only inserts after Twitter's API confirms the post went out, so a
-- failed/retried run never leaves a phantom record for a tweet that
-- never actually happened. Purely a history log (social_post.py is
-- manually triggered, given a specific problem each run) — nothing
-- reads this to auto-pick a problem.
CREATE TABLE social_posts (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug      TEXT NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_social_posts_slug ON social_posts(slug);
