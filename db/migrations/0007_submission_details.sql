-- Reduced judge output for "click a submission to see what
-- happened" — first failing test only, not the full per-test array
-- (which can be arbitrarily large; some problems' own inputs run up
-- to 100,000 lines). NULL for submissions made before this column
-- existed; API/UI treat that as "details not available."
ALTER TABLE submissions ADD COLUMN details JSONB;
