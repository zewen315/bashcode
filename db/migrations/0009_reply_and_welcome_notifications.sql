-- Per-user, targeted notifications (reply-to-your-comment, welcome-
-- on-signup) — deliberately a separate table from announcements
-- (0004_announcements.sql), which is a global broadcast with no
-- per-user row. This is the opposite shape: one row per (event,
-- recipient), with its own read_at rather than a join-table "unread."
-- The two are merged at query time in notifications.py, not unified
-- into one schema.
CREATE TABLE notifications (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  link       TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
