-- Deleting an account must not destroy comments (or, transitively via
-- parent_id's own cascade, other users' replies to them) — matches
-- the same "content survives, author link doesn't" treatment
-- self-delete already gives a comment's body. comment_votes keeps its
-- existing ON DELETE CASCADE: losing a deleted user's votes is fine.
ALTER TABLE comments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE comments DROP CONSTRAINT comments_user_id_fkey;
ALTER TABLE comments ADD CONSTRAINT comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
