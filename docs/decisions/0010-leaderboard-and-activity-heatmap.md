# 0010 — Real leaderboard, activity heat map, and honest tags

Status: **Implemented and verified locally. Not yet deployed.**

## Context

Three follow-ups from the same feedback pass:

1. `LeaderboardPlaceholder`'s own copy named its blocker as "needs
   accounts and cross-user stats, neither of which exist yet" — both
   resolved by 0008 (progress moved to Postgres). Time to build the
   real thing.
2. `MiniCalendar` showed a plain current-month grid with no
   activity-awareness at all — asked to highlight active days green
   and show finished-in-last-3/7-days counts.
3. `topics:` tagging in `bashcode-problems/*/config.yaml` had
   "text-processing" on 6 of 9 problems — confirmed via grep, a
   genuinely overused, non-specific catch-all. Separately, the
   `/problems` filter sidebar padded its tools/topics lists with a
   hardcoded "declared taxonomy" (`CANONICAL_TOOLS`/`CANONICAL_TOPICS`
   in `problems-explorer.tsx`) that mostly listed tags no real problem
   used (11 of 14 canonical tools were unused).

## Design decisions worth knowing

- **Leaderboard is its own endpoint** (`GET /progress/leaderboard`),
  not folded into `GET /progress` — cross-user data is a different
  resource from this-user progress, fetched independently by a new
  `Leaderboard` component rather than routed through `useProgress()`.
- **Ranking query includes every registered user**, not just users
  with at least one Accepted submission: `LEFT JOIN` from `users` into
  a per-user solved count, then `RANK() OVER (ORDER BY solved DESC)`
  and `COUNT(*) OVER ()` for the total, in one query. A user who
  hasn't solved anything still gets an honest percentile against
  everyone registered.
- **Percentile = "solved more than X% of users"**:
  `(total_users - rank) / (total_users - 1) * 100`. Left `null` when
  `total_users <= 1` — the UI shows "come back once more people join"
  instead of a meaningless 100th-percentile-of-one claim. Verified
  both branches directly: seeded two synthetic accounts via
  `auth._get_or_create_user()`, confirmed complementary rank/percentile
  (rank 1/100% vs rank 2/0%), then deleted one and confirmed
  `percentile: null` with one account left.
- **Leaderboard is sign-in gated**, reusing `notification-menu.tsx`'s
  established "Sign in to see notifications." copy pattern verbatim
  for "Sign in to see your ranking."
- **The graph is a plain Tailwind filled bar**, not a new charting
  dependency — same precedent as `status-chart.tsx`'s custom SVG ring
  (chosen there specifically to avoid a chart library). A single
  percentile value doesn't need the ring's multi-segment machinery.
- **Calendar heat map extends `GET /progress`** rather than adding a
  new endpoint — still per-user progress, just three more fields:
  `active_dates` (all distinct UTC days with any submission),
  `finished_last_3_days`, `finished_last_7_days` (distinct slugs
  solved in that window). No date-range param — one user's distinct
  active-day count stays small even over years of daily use.
- **Days are grouped by UTC, not the viewer's local timezone.**
  Nothing else in this app is timezone-aware (activity elsewhere shows
  as relative time, not calendar days). Confirmed the resulting
  behavior via a real screenshot: a submission made at the container's
  "now" (UTC) appeared highlighted on the 13th while the browser's
  local "today" was the 12th — a known, accepted simplification, not a
  bug, matching what GitHub's contribution graph historically did.
- **Signed-out mode derives the same three fields client-side** from
  the existing capped 15-entry local activity list
  (`getRecentActivity()`), inside `progress-context.tsx`'s `load()` —
  no new `local-progress.ts` functions, pure derivation from data
  already read. Inherits the pre-existing 15-entry cap limitation
  (same one `RecentActivity` already lives with).
- **`MiniCalendar` became a self-contained `useProgress()` consumer**
  (gained `"use client"`), mirroring `StatusChart`/`RecentActivity`,
  instead of the right-rail/profile page passing progress data in as
  props. The existing `today` prop was left untouched.
- **Active-day styling: green only when the cell isn't "today."**
  Today already has a distinct filled-primary-circle treatment;
  layering green on top would make today's cell ambiguous.
- **Topics re-tagged per-problem based on actual content**, not a
  find-and-replace of "text-processing": e.g. `find-invalid-config-lines`
  had `config-management` as a tag despite actually validating a
  `<name> <ip> <port>` server listing, not `KEY=VALUE` config files —
  corrected to just `validation`. `prod-services` (hostname→service
  filtering) got `inventory, filtering`; `render-progress-bar` (percent
  → bar-width rounding) got `formatting, arithmetic`; etc. — each
  reconsidered against its real `problem.md`, not mechanically
  stripped.
- **`CANONICAL_TOOLS`/`CANONICAL_TOPICS` deleted outright** rather than
  trimmed — `problems-explorer.tsx`'s tools/topics filter lists are now
  purely `Array.from(new Set(problems.flatMap(...)))`, so the sidebar
  can never show a tag with zero matching problems.

## What shipped

- `bashcode-problems/*/config.yaml` — `topics:` re-tagged for 7 of 9
  problems (the two already-specific ones, `find-long-running-processes`
  and `top-error-endpoints`, were left as-is).
- `web/frontend/src/components/problems-explorer.tsx` — removed the
  hardcoded canonical arrays; tools/topics filters now derive solely
  from real problem data.
- `web/backend/progress.py` — `get_progress()` gains `active_dates`,
  `finished_last_3_days`, `finished_last_7_days`; new
  `GET /progress/leaderboard`.
- `web/frontend/src/lib/progress-api.ts` — `ProgressData` gains the
  three new fields; new `fetchLeaderboard()`.
- `web/frontend/src/lib/progress-context.tsx` — `ProgressContextValue`
  gains `activeDates`/`finishedLast3`/`finishedLast7`; signed-out
  branch derives them from local activity, signed-in branch passes the
  server's values through; `recordSubmission` and `clearHistory`
  updated to keep them in sync with new activity/resets.
- `web/frontend/src/components/leaderboard.tsx` (new, replaces the
  deleted `leaderboard-placeholder.tsx`).
- `web/frontend/src/components/mini-calendar.tsx` — now a client
  component reading `useProgress()`, with green active-day highlighting
  and the two stat lines.
- `web/frontend/src/components/problems-right-rail.tsx` — swapped in
  `<Leaderboard />`.

## Verification

Against the real running local stack (not just review):

- Restarted the local `uvicorn` process (it runs without `--reload`)
  to pick up the `progress.py` changes.
- Seeded two synthetic accounts directly via
  `auth._get_or_create_user()` with distinct solved counts, hit
  `/progress` and `/progress/leaderboard` with real session cookies —
  confirmed `active_dates`/3-day/7-day counts against a manual
  cross-check, and confirmed the two accounts' ranks/percentiles were
  correctly complementary (rank 1 of 2 → 100%, rank 2 of 2 → 0%).
  Deleted one account and confirmed the `total_users <= 1` →
  `percentile: null` path.
- Confirmed `GET /progress/leaderboard` 401s with no session cookie.
- Playwright pass (browser launched via the project's cached
  `playwright` install, cookie injected directly rather than going
  through real OAuth): screenshotted `/problems` signed-out (real
  Tools/Topics lists, 0/0 calendar stats, sign-in leaderboard prompt),
  `/problems` signed-in (green-highlighted active days, correct 3/7-day
  counts, correct solo-user leaderboard message), and `/profile`
  signed-in (same calendar behavior in the larger widget). Zero
  console/page errors in all three passes.
- All new/touched files pass `npx eslint` with zero new violations
  (one pre-existing `set-state-in-effect` violation in
  `problems-explorer.tsx`, unrelated to this change, left alone per
  established policy) and `npx tsc --noEmit` clean.
- All synthetic accounts and sessions deleted after verification.

## Explicitly out of scope

- Per-user timezone-aware day bucketing for the heat map (UTC days
  only, documented above).
- Leaderboard filtering/scoping (friends-only, weekly boards, etc.) —
  just the one global ranking.
- Month navigation on `MiniCalendar` — still current-month only, a
  pre-existing constraint this didn't touch.
- Discussion/comment system — still separate, larger, not started.
