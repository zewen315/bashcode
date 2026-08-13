# 0007 — Real notifications, profile widgets, activity merge, theme setting

Status: **Implemented and verified locally. Not yet deployed.**

## Context

Follow-up on the Profile stub (0006). Four related asks:
1. Profile should show "Your Status," a calendar, and Recent Activity.
2. Settings should have an explicit light/dark mode control.
3. "Merge recent activity."
4. Add real notifications (the bell icon was a pure stub — "No
   notifications yet — coming soon.").

Confirmed via AskUserQuestion:
- **"Merge recent activity" = fold the standalone `/activity` page
  into Profile** — one canonical full-activity destination instead of
  two. The `/problems` sidebar's Recent Activity *teaser* widget stays
  (removing it would be a real regression — it's a different job than
  Profile's full list, a glanceable check while browsing problems);
  only its "More" link target changes, from the now-removed
  `/activity` to `/profile`.
- **Notifications start as manual, operator-posted announcements**,
  shown to all signed-in users with real read/unread tracking — not
  event-driven yet, not just plumbing with nothing behind it.

## Design decisions worth knowing (why, not just what)

- **Profile's widgets reuse existing components as-is** —
  `StatusChart`, `MiniCalendar`, `ActivityList` (already built for the
  `/problems` sidebar and the now-removed `/activity` page). Still
  `localStorage`-backed, still per-browser — an explicit continuation
  of those widgets' existing behavior, not a new decision. The real
  fix (server-backed progress data) is still the separately-deferred
  future task from 0006.
- **`/profile/page.tsx` fetches `listProblems()` in a `useEffect`**
  rather than being a server component — it needs `useAuth()`
  (client-only), so this matches the pattern already used elsewhere in
  this app for client-side data fetching rather than restructuring the
  `(account)` route group.
- **Announcements schema is a join, not a fan-out table**:
  `announcements` (global content) + `announcement_reads`
  (`(announcement_id, user_id)` marking what's read). Checking "not in
  reads" scales fine at this size and avoids writing N rows every time
  an announcement is posted.
- **No admin UI for posting announcements** — the operator inserts
  directly via `psql` on the droplet:
  ```sql
  INSERT INTO announcements (title, body) VALUES ('Title here', 'Body here');
  ```
  Building an admin-auth system just to support an occasional text
  post is out of proportion for "manual announcements, start minimal."
- **Notifications are gated behind sign-in** — read state is
  inherently per-user, same reasoning as every other account-scoped
  feature this session. Signed-out visitors see "Sign in to see
  notifications" instead of a list.
- **`GET /notifications` is a single LEFT JOIN**
  (`announcements LEFT JOIN announcement_reads ... WHERE user_id = %s`),
  not two queries — read/unread comes back in one pass.
- **`POST /notifications/read-all` included alongside per-item read**
  — a standard bell-dropdown affordance, not scope creep: identical
  mechanism (insert into `announcement_reads`), applied to every
  unread row via one `INSERT ... SELECT`.
- **Theme control in Settings uses three plain buttons** (Light / Dark
  / System via `next-themes`), matching the icon-button-group pattern
  already used for the avatar toggle in `ProfileEditor`, rather than
  the existing `Select` component — a 3-way pick doesn't need a
  dropdown.
- **No `mounted` guard needed for the theme buttons**, unlike the
  nav-bar's `ThemeToggle` — Settings' entire page body is already
  gated behind `if (!user) return null` (from `AuthProvider`'s
  loading/user state), so the theme-dependent styling never appears in
  the server-render or first-hydration pass to begin with; there's
  nothing to mismatch.
- **A real (pre-existing) linting pattern surfaced during this work**:
  this codebase's `react-hooks/set-state-in-effect` rule flags a
  direct synchronous `setState(...)` call as a bare statement in an
  effect body (e.g. `setSolved(getSolvedSlugs())`), but does *not*
  flag the same value being set via a `.then(callback)` chain off an
  async call. All new code in this task (`notification-menu.tsx`)
  follows the async/cancelled-flag pattern already established in
  `auth-context.tsx` (0006). Confirmed this same violation already
  exists, unrelated to this task, in several files this task reuses
  unmodified (`status-chart.tsx`, `mini-calendar.tsx` via
  `activity-list.tsx`, `recent-activity.tsx`) — left alone as
  pre-existing, out-of-scope debt rather than drive-by "fixed" here.
- **`Date.now()` can't be called directly during render** (a separate
  purity rule) — `notification-menu.tsx` grabs its timestamp via a
  lazy `useState(() => Date.now())` initializer instead.

## Schema

`db/migrations/0004_announcements.sql`:
```sql
CREATE TABLE announcements (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE announcement_reads (
  announcement_id  BIGINT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);
```

## What shipped

- `web/backend/notifications.py` (new) — `GET /notifications`,
  `POST /notifications/{id}/read`, `POST /notifications/read-all`.
- `web/backend/main.py` — includes the notifications router.
- `web/frontend/src/lib/notifications.ts` (new).
- `web/frontend/src/components/notification-menu.tsx` — real data,
  unread-count `Badge`, mark-read/mark-all-read.
- `web/frontend/src/app/(account)/profile/page.tsx` — `Widget`-wrapped
  `StatusChart`, `MiniCalendar`, `ActivityList`.
- `web/frontend/src/components/recent-activity.tsx` — "More" link
  target changed from `/activity` to `/profile`; otherwise unchanged.
- `web/frontend/src/app/activity/` — deleted (confirmed via grep
  exactly one inbound link in the whole codebase, the one repointed
  above).
- `web/frontend/src/app/(account)/settings/page.tsx` — new
  "Appearance" section (Light/Dark/System buttons).

## Verification

Done against the real local Postgres + local-uvicorn setup (synthetic
sessions via `auth._get_or_create_user`, no live provider consent
needed):

- Posted real announcements via `psql`; confirmed `GET /notifications`
  returns `read: false` for a fresh user, `401` with no session.
- Confirmed `POST /{id}/read` and `POST /read-all` both correctly flip
  `read` on a subsequent `GET`.
- Real browser pass: bell badge showed "3" for three unread
  announcements, dropped to "2" after marking one read, disappeared
  entirely after "Mark all as read" — zero page errors throughout.
- `/profile` renders Status/Calendar/Activity widgets with zero page
  errors, matching the same components' appearance on `/problems`'
  sidebar (literally the same components).
- `/activity` confirmed 404 (route removed).
- Settings' Appearance buttons: clicking "Dark" actually flipped the
  whole site's theme (confirmed via the `<html>` element's class
  list) and the button's active state updated correctly.

## Explicitly out of scope
- Event-driven notifications (welcome messages, milestone badges).
- Any admin UI for posting announcements.
- Migrating Status/Calendar/Activity off `localStorage` onto the
  account — still the separately-deferred 0006 task.
- Removing or changing the `/problems` sidebar's Recent Activity
  widget beyond its link target.
