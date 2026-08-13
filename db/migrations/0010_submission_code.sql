-- The code that was actually submitted, so a past submission can be
-- inspected later, not just its verdict/first-failure (see
-- 0007_submission_details.sql). NULL for submissions made before this
-- column existed — same "not available for this older submission"
-- fallback already established for the details column. Already
-- bounded by SubmitRequest.code's own CODE_MAX_LENGTH (20,000 chars)
-- before it ever reaches this INSERT, so no further truncation needed.
ALTER TABLE submissions ADD COLUMN code TEXT;
