-- Lets a user hide one announcement for themselves without a
-- per-user broadcast row (that's the point of announcement_reads
-- being a join table, not a fan-out) — existence of a row already
-- means "read"; this adds an independent "and I removed it" marker.
ALTER TABLE announcement_reads ADD COLUMN hidden_at TIMESTAMPTZ;
