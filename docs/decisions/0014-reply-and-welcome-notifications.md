# 0014 — Reply notifications, welcome notification, submission code history

Status: **Implemented and verified locally. Not deployed (held per explicit instruction).**

## Context

Three related follow-ups:

1. Replying to someone's comment produced no notification to the
   person replied to.
2. New sign-ups got no notification prompting them to read the Terms
   — and a broader question of how to notify *all* users at once.
3. A historical submission's expanded view (0012) showed the first
   failing test but not the actual code that was submitted.

## Design decisions worth knowing

- **The existing "notifications" system turned out to be a global
  announcement broadcaster, not a per-user notification system**:
  `announcements` (no `user_id`) + `announcement_reads` (a join table
  — "unread" is just "not in here yet," so posting one announcement
  never needs a row per user). That already fully answers "how do we
  notify all users" — insert one row into `announcements` (still a
  manual `psql` INSERT, no admin UI, unchanged — not asked for here).
- **Reply and welcome notifications are a different shape** (one
  event, one specific recipient) and got a **second, new
  `notifications` table** rather than being forced through the
  broadcast/join-table model. Two tables, two shapes, merged only at
  query time (`UNION ALL` in `notifications.py`, ordered by
  `created_at`), IDs prefixed (`a123`/`n45`) so the two id spaces
  never collide. `mark_read`/`read-all` parse the prefix and touch
  whichever table it points to. Verified directly: marking all as
  read for one user touched both an announcement's read state and a
  personal notification's `read_at`, while a *different* user's read
  state on the same shared announcement was untouched.
- **A new `notify.py` module**, not a function added to
  `notifications.py` — `notifications.py` already does `from auth
  import require_user_id`, so `auth.py` importing back for the
  welcome notification would be circular. `notify.py` depends only on
  `db.py`.
- **Reply notifications target the parent comment's specific author**
  (looked up during the existing single-level-threading check in
  `create_comment()`), not everyone in the thread. Skipped when the
  parent's author is `NULL` (deleted account, 0013) or is the replier
  themselves — verified directly: replying to your own comment
  produced zero notifications; a different user replying produced
  exactly one, with the correct title/body/link.
- **Welcome notification fires in the OAuth callback**, exactly where
  `is_new` already exists and already picks the post-login redirect
  (`"welcome" if is_new else "problems"`) — no new signal needed, just
  one more thing done in that branch. Both new call sites are
  best-effort (try/except, matching the existing submission-recording
  pattern in `main.py`) — a notification failure never blocks the
  actual reply/login.
- **Submission code storage mirrors 0012's `details` column exactly**:
  one new nullable `code TEXT` column, `NULL` for pre-migration rows,
  same "not available for this older submission" fallback UI. No
  truncation needed — `SubmitRequest.code` was already capped at
  `CODE_MAX_LENGTH` (20,000 chars) before this change existed. Code
  renders in the same `<pre>` styling already used for `solution_code`
  in `problem-solution.tsx`.

## Schema

- `db/migrations/0009_reply_and_welcome_notifications.sql` — new
  `notifications` table (`user_id`, `title`, `body`, `link`,
  `read_at`, `created_at`).
- `db/migrations/0010_submission_code.sql` — `submissions.code TEXT`.

## What shipped

- `web/backend/notify.py` (new).
- `web/backend/auth.py` — welcome notification on `is_new`.
- `web/backend/comments.py` — reply notification in `create_comment()`.
- `web/backend/notifications.py` — rewritten to merge both sources;
  `mark_read`/`mark_all_read` updated for prefixed ids.
- `web/backend/main.py` — `submit()` now stores `code`.
- `web/backend/progress.py` — `get_submission_detail()` returns `code`.
- `web/frontend/src/lib/notifications.ts` — `id: string`, `link`
  field.
- `web/frontend/src/components/notification-menu.tsx`,
  `app/(account)/notifications/page.tsx` — rows with a `link` navigate
  (and mark read); rows without keep the existing mark-read-only
  behavior unchanged.
- `web/frontend/src/lib/progress-api.ts` — `SubmissionDetail.code`.
- `web/frontend/src/components/problem-submissions.tsx` — expanded
  submission rows show a "Submitted code" block alongside the
  existing result, independently falling back to "not available" if
  either piece is missing.

## Verification

Against the real local stack:

- Two synthetic accounts, full reply-notification lifecycle: self-reply
  produced no notification; a different user's reply produced exactly
  one, correct title/body (`"{name} replied to your comment on
  {problem title}."`)/link (`/problems/{slug}?tab=discussion`).
- `notify.create_notification()` tested directly (the welcome hook
  itself lives in the OAuth callback, which can't be exercised without
  real OAuth — confirmed correct by direct code review of the
  `if is_new:` branch instead, same limitation as 0005's original
  onboarding-redirect work).
- Posted a real `announcements` row via `psql`-equivalent INSERT,
  confirmed it merges correctly with a personal notification in one
  `GET /notifications` call, correctly ordered by `created_at`.
  Confirmed `read-all` marks both kinds for one user without touching
  another user's read state on the same announcement.
- Submitted a real solution through the judge, confirmed `code` is
  stored and returned via `GET /progress/submissions/{id}`; manually
  nulled a row's `details`+`code` and confirmed the graceful fallback
  instead of an error.
- Real Playwright pass: bell dropdown and `/notifications` page both
  render a mix of announcement + personal notifications correctly;
  clicking the reply notification navigated to
  `/problems/prod-services?tab=discussion`; expanding a submission row
  showed both the judge result and the submitted code. Zero console
  errors throughout.
- `npx eslint` + `npx tsc --noEmit` clean; backend syntax-checked,
  restarted, both migrations applied cleanly on startup.
- All synthetic accounts, sessions, comments, notifications, and the
  test announcement deleted after verification.

## Explicitly out of scope
- An admin UI for posting announcements.
- Notifying every participant in a thread, not just the parent
  comment's author.
- Email/push notifications — in-app only.
- Editing/deleting past submission code — display only.

## Deploy status
Committed but **not deployed** — held at the user's explicit request
pending further requirements.
