# 0012 — Clickable submission details

Status: **Implemented and verified locally. Not yet deployed.**

## Context

The Submissions tab listed past submissions as plain, non-interactive
rows (verdict icon, verdict, relative time) — no way to see what
actually happened. The detail existed but was always thrown away: the
judge (`judge/run_submission.py`'s `judge()`) returns a full per-test
breakdown to `POST /submit`, shown once via `LiveResult` and then
discarded — only `verdict` was ever written to `submissions`
(`main.py`, pre-change: `INSERT INTO submissions (user_id, slug,
verdict) ...`).

## Design decisions worth knowing

- **Persist a reduced shape, not the full test array.** `judge()`
  returns every test's full expected/actual text, and problems'
  constraints allow inputs up to 100,000 lines. The existing
  `LiveResult` component already only ever shows the **first failing
  test** (`result.tests.find(t => !t.passed)`) plus a total count —
  never all tests, even live. Persisting that same reduced shape
  (`elapsed_seconds`, `total_tests`, `first_failure`) keeps every
  stored row small and needs no new UI language.
- **`expected`/`actual` truncated to 4000 chars before storing**
  (`main.py`'s `_truncate()`), bounding worst-case JSONB size
  regardless of a problem's own output size. Only affects what's
  persisted — the live `/submit` response is untouched.
- **One nullable `details JSONB` column** on `submissions`
  (`db/migrations/0007_submission_details.sql`), not a new table —
  1:1 with a submission row. `NULL` for every pre-migration
  submission; API and UI both treat that as "details not available,"
  verified directly by nulling a row and confirming the fallback
  message renders instead of erroring.
- **Details are fetched lazily**, not inlined into `GET /progress` —
  that payload is shared across several widgets (Recent Activity,
  Shortcuts, this tab), most of which never need it. `GET /progress`'s
  activity entries gained just the submission `id`; a new `GET
  /progress/submissions/{id}` fetches one submission's details on
  click, gated by `require_user_id` + ownership (404 for both
  not-found and not-owned — verified both return 404, not leaking
  which case it was).
- **Anonymous submissions can't have this** — they were never written
  to Postgres, only kept as a `{slug, verdict, at}` digest in
  `localStorage`. `ActivityEntry` gained an *optional* `id?: number`;
  local entries never set it, and rows without an `id` render exactly
  as before this feature — not broken, just not upgraded. Same
  boundary 0008 already established for every other cross-session
  feature.
- **`LiveResult` generalized into `SubmissionResult`**, consuming a
  shared `SubmissionResultData` type instead of the full `SubmitResult`.
  The live call site derives the reduced shape from the existing
  `SubmitResult` at render time (`submitResultToData()`); the
  historical call site gets it directly from the new endpoint. One
  rendering component, two sources.
- **Rows expand inline (accordion)**, matching how comment threads
  already collapse/expand in this app (0011) rather than introducing a
  new interaction pattern (modal, navigation). Fetched details are
  cached per submission id in component state so re-expanding an
  already-fetched row doesn't refetch.

## What shipped

- `db/migrations/0007_submission_details.sql` (new).
- `web/backend/main.py` — `_truncate()`/`_submission_details()`
  helpers; `submit()`'s INSERT gains `details` via
  `psycopg.types.json.Json(...)`.
- `web/backend/progress.py` — activity query gains `id`; new `GET
  /progress/submissions/{id}`.
- `web/frontend/src/lib/local-progress.ts` — `ActivityEntry` gains
  optional `id`.
- `web/frontend/src/lib/api.ts` — new shared `SubmissionResultData` type.
- `web/frontend/src/lib/progress-api.ts` — new `SubmissionDetail` type
  and `fetchSubmissionDetail()`.
- `web/frontend/src/components/problem-submissions.tsx` — `LiveResult`
  → `SubmissionResult` (shared, reduced-shape); new `SubmissionRow`
  with click-to-expand, per-id fetch caching, and a graceful "details
  not available" state for `details: null`.

## Verification

Against the real local stack:

- Submitted a real Accepted solution (`prod-services/solution.sh`) and
  a deliberately wrong one through the actual judge with a synthetic
  session — confirmed `submissions.details` populated correctly for
  both (`first_failure: null` vs. populated with the real first
  failing test's expected/actual).
- `curl /api/progress` — confirmed `id` present on every activity
  entry. `curl /api/progress/submissions/{id}` — confirmed correct
  payload for both verdicts, 404 for a nonexistent id and for another
  user's id, 401 signed-out.
- Manually nulled a row's `details` (simulating pre-migration data),
  confirmed the endpoint returns `details: null` and the UI shows
  "Details aren't available for this older submission" instead of
  erroring.
- Real Playwright pass: expanded both a Wrong Answer row (full
  first-failure detail, matching `LiveResult`'s live rendering
  pixel-for-pixel) and the nulled Accepted row (graceful fallback).
  Zero console errors.
- `npx eslint` + `npx tsc --noEmit` clean. Backend syntax-checked and
  restarted cleanly, migration applied on startup.
- Synthetic account, sessions, and submissions deleted after
  verification.

## Explicitly out of scope

- Backfilling details for pre-migration submissions — the original
  judge output was never captured, genuinely unrecoverable.
- Showing the full per-test breakdown (not just the first failure) for
  historical submissions — matches the live result view's existing
  limitation, not a new one introduced here.
- Anonymous/signed-out submission details — no server record exists to
  fetch from.
- The just-submitted entry isn't immediately expandable in the
  historical list (no `id` until the next `/progress` refetch) — minor,
  since its full result is already shown live via `SubmissionResult`
  right above the list at that moment.
