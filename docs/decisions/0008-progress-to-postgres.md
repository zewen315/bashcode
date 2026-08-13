# 0008 — Move solved/starred/attempted/activity from localStorage to Postgres

Status: **Implemented and verified locally. Not yet deployed.**

## Context

Every account feature shipped this session (0002-0007) explicitly
deferred this: solved/starred/attempted/activity lived entirely in
`localStorage` (`lib/local-progress.ts`), per-browser, not tied to the
account even though real accounts existed. The user asked to start
this and to discuss the design first — specifically how localStorage
and the DB should interact around registration and logout.

Discussed and confirmed (user deferred to the recommendation):
- **Dual-mode, not sign-in-required.** Anonymous users keep exactly
  the previous localStorage-only behavior — signing in stays optional
  for trying problems.
- **Merge-on-login, not just first-login**, via an idempotent import.
- **Clean cut on logout** — nothing from the account's DB progress is
  ever written back into localStorage.
- **A shared `useProgress()` Context**, not scattered `if (user)`
  branches across the 7 components that touched this data.

## Design decisions worth knowing (why, not just what)

- **This also fixed a real, previously-unreported cross-component sync
  gap** — verified directly, not just theorized. Before this change,
  `Shortcuts` and `ProblemsExplorer` (sibling components on
  `/problems`) each independently read `localStorage` on their own
  mount; starring a problem in the table didn't update the sidebar's
  count without a full reload. `ProblemSubmissions` had a
  `liveResult`-triggered re-read workaround for a version of the same
  gap. Verified via Playwright: starring a row in the table now
  updates `Shortcuts`' count immediately, both signed out and signed
  in, with zero page reload — confirmed in both modes.
- **Schema is two tables, not a 1:1 mirror of the four localStorage
  keys**: `submissions` (`user_id, slug, verdict, submitted_at`) and
  `starred_problems` (`user_id, slug, starred_at`). "Solved" and
  "attempted" are queries over `submissions`, not separate tables.
  `UNIQUE (user_id, slug, verdict, submitted_at)` makes `/progress/import`
  idempotent — verified directly: calling import twice with the exact
  same payload produced no duplicate rows.
- **`/submit` records the submission server-side itself**, when signed
  in, right after the judge result is computed — not a second client
  call after the fact. Verified directly: a real judge submission
  through a synthetic signed-in session produced a `submissions` row
  with zero separate API call from the test script. Failure to record
  (e.g. a transient DB hiccup) is caught and logged, never blocks the
  judge result from reaching the user.
- **The frontend never makes a separate "record this submission" API
  call for signed-in users** — `ProgressProvider.recordSubmission`
  updates its in-memory cache directly from the `/submit` response
  already in hand. Signed out, it still writes through to
  `local-progress.ts` exactly as before.
- **`GET /progress`'s `activity` shape matches the existing
  `ActivityEntry` type exactly** (`{slug, verdict, at}`, `at` as epoch
  milliseconds) so `activity-list.tsx`, `recent-activity.tsx`, and
  `problem-submissions.tsx` only needed their *data source* swapped —
  their rendering logic didn't change.
- **Settings' "Reset coding history" (0007) turned out to need no
  signed-out branch at all** — `/settings` has been signed-in-only
  since the `(account)` route group layout was introduced in 0006, so
  the anonymous `resetCodingHistory()` path in `local-progress.ts` was
  actually unreachable dead code from the moment 0007 wrote it (it
  correctly cleared localStorage for a signed-in user, which was fine
  before this migration since that's where signed-in progress lived
  too — but is no longer correct now that signed-in progress lives in
  Postgres). Removed `resetCodingHistory()` entirely; the button now
  always calls the new `DELETE /progress/submissions`.
- **Account deletion needed no new code** — `submissions` and
  `starred_problems` both `REFERENCES users(id) ON DELETE CASCADE`.

## Schema

`db/migrations/0005_progress.sql`:
```sql
CREATE TABLE submissions (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug         TEXT NOT NULL,
  verdict      TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug, verdict, submitted_at)
);

CREATE TABLE starred_problems (
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  starred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slug)
);
```

## What shipped

- `web/backend/auth.py` — `get_user_id_or_none()`, used by `/submit`.
- `web/backend/progress.py` (new) — `GET /progress`,
  `POST`/`DELETE /progress/star/{slug}`, `DELETE /progress/submissions`,
  `POST /progress/import`.
- `web/backend/main.py` — `/submit` records a submission server-side
  when signed in.
- `web/frontend/src/lib/progress-api.ts` (new).
- `web/frontend/src/lib/local-progress.ts` — now the anonymous-mode
  implementation only, called exclusively from inside
  `ProgressProvider`; gained `hasLegacyData`/`readAllLocalProgress`/
  `clearAllLocalProgress`; lost the now-dead `resetCodingHistory`.
- `web/frontend/src/lib/progress-context.tsx` (new) —
  `ProgressProvider` + `useProgress()`.
- `web/frontend/src/app/layout.tsx` — `ProgressProvider` nested inside
  `AuthProvider`.
- All 7 previous direct consumers of `local-progress.ts`
  (`status-chart.tsx`, `recent-activity.tsx`, `activity-list.tsx`,
  `shortcuts.tsx`, `problems-explorer.tsx`, `problem-submissions.tsx`,
  `problem-workspace.tsx`) switched to `useProgress()`.
  `problem-submissions.tsx` dropped its `liveResult` re-read workaround
  entirely — filtering the shared `activity` array is already reactive.
- `web/frontend/src/app/(account)/settings/page.tsx` — reset button
  now always calls the DB-backed reset.

## Verification

Done against the real running system — local Postgres/uvicorn, a
synthetic session via `auth._get_or_create_user`, and a real judge
submission through the actual sandbox:

- Migration applied cleanly.
- Real judge submission (`prod-services`' actual `solution.sh`) while
  signed in → confirmed a `submissions` row appeared with zero
  separate client call.
- `GET /progress` → correct solved/attempted/activity derived from
  that one submission.
- `POST`/`DELETE /progress/star/{slug}` → confirmed both directions.
- Import called twice with an identical payload → confirmed no
  duplicate `submissions` rows and no duplicate `starred_problems` row
  (idempotency proven, not assumed).
- `DELETE /progress/submissions` → confirmed it clears submissions but
  leaves `starred_problems` untouched.
- Unauthenticated `GET /progress` → confirmed 401, not a crash.
- Real browser pass (Playwright), the actual end-to-end story:
  1. Anonymous: starred a row in the table, confirmed `Shortcuts`'
     count updated live (no reload) and `localStorage` was written —
     the cross-component-sync regression test, passing.
  2. Seeded `localStorage` with legacy solved/starred/activity data,
     then signed in — confirmed `localStorage` was fully cleared
     (import + clear both happened) and `Shortcuts`/`StatusChart`
     immediately reflected the merged DB data, combining both the
     pre-sign-in anonymous star *and* the seeded legacy data correctly.
  3. Starred another problem while signed in — confirmed live update,
     no reload, same as the anonymous case.
  4. Signed out — confirmed `localStorage` had nothing from the
     account (no leakage) and the UI reverted to empty, not showing
     the just-signed-out account's data.
  - Zero page errors across the entire flow.

## Explicitly out of scope
- Any UI indicating "this was imported from your browser" — silent,
  matching how account creation itself doesn't announce what happened
  under the hood.
- Multi-device live sync (e.g. a WebSocket pushing updates to other
  open tabs/devices) — each `ProgressProvider` mount fetches fresh.
- Changing what `/run` does — still never recorded as activity/solved.
