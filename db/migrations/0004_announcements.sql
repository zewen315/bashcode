-- Manual, operator-posted announcements (no admin UI — posted via a
-- direct psql INSERT, see docs/decisions/0007-notifications.md).
CREATE TABLE announcements (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A join, not a fan-out table — "unread" is just "not in here yet",
-- so posting an announcement never requires writing one row per user.
CREATE TABLE announcement_reads (
  announcement_id  BIGINT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);
