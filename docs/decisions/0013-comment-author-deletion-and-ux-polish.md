# 0013 — Deleted-user comments, nicer empty states, bell icon fix, About copy

Status: **Implemented and verified locally. Not yet deployed.**

## Context

Four follow-ups from the discussion/notification work shipped earlier
this session:

1. Account deletion was silently destroying content: `comments.user_id`
   referenced `users(id) ON DELETE CASCADE`, so deleting your account
   cascade-deleted every comment you'd written — and because
   `comments.parent_id` also cascades, any *other* user's reply under
   one of your comments vanished too.
2. Empty states in Submissions/Discussion tabs were a single plain
   sentence.
3. The bell icon always opened a dropdown, even signed out (showing
   "Sign in to see notifications" inside it) — asked for a direct link
   to `/notifications` when signed out instead, landing on a page that
   gracefully shows no content rather than redirecting away.
4. About page said "LeetCode-style" and cited a hardcoded "9 problems"
   count that would read as stale the moment more problems ship.

## Design decisions worth knowing

- **`ON DELETE SET NULL`, not a denormalized author snapshot.**
  `comments.user_id` is now nullable; the FK
  (`comments_user_id_fkey`) changed from `ON DELETE CASCADE` to
  `ON DELETE SET NULL` (`db/migrations/0008_comments_user_delete.sql`).
  The comment (and any replies under it) survive account deletion
  untouched — only the link to the now-gone user is severed.
  `comment_votes.user_id` keeps its existing `ON DELETE CASCADE`
  unchanged, confirmed via a real deletion test: a deleted user's own
  votes disappear (and vote counts drop accordingly), but their
  comments and other users' replies to them stay exactly as they were.
- **Both comment queries moved from `JOIN users` to `LEFT JOIN
  users`** (`_fetch_comments` and `discussions_feed` in
  `comments.py`) — an inner join would have silently dropped a
  deleted-user's comment from every result once `user_id` went `NULL`,
  the opposite of "still show the comment."
- **"deleted user" is synthesized server-side** via a shared
  `_author_dict()` helper, keyed off the *joined user row's id* being
  null — not off `display_name` being falsy, since a real user could
  in principle have a blank name. The frontend needed zero new logic:
  the existing `initials()` avatar fallback and the existing
  `isOwner = user?.public_id === comment.author.public_id` ownership
  check both already do the right thing once `public_id` can be
  `null` (nobody's own `public_id` is ever `null`, so a deleted user's
  old comment is correctly never shown as deletable by anyone). Only
  `CommentAuthor.public_id`'s type changed, to `string | null`.
- **Bell icon**: signed-out now renders a plain `Button` composed with
  `render={<Link href="/notifications" />} nativeButton={false}` (the
  same Base UI composition already used elsewhere in this app) instead
  of a `DropdownMenu` — confirmed via Playwright that clicking it
  navigates straight to `/notifications` with no dropdown involved.
  Signed-in keeps the exact same dropdown as before; the now-
  unreachable "Sign in to see notifications" branch inside
  `DropdownMenuContent` was deleted.
- **`/notifications` stays inside the `(account)` route group**
  (not extracted to a standalone route) via a one-route allowlist,
  `PUBLIC_ACCOUNT_ROUTES`, in `(account)/layout.tsx` — the smaller,
  more surgical fix that keeps the just-shipped sidebar nav
  (Profile/Activity/Notifications/Settings) intact everywhere else.
  The layout's redirect effect and blank-render guard both skip that
  one path; the sidebar's identity block (which unconditionally reads
  `user.display_name` etc.) falls back to a plain "Sign in to see your
  account." line instead of the whole layout going blank. Verified via
  Playwright: `/profile` still redirects a signed-out visitor to
  `/problems` exactly as before (the allowlist didn't leak), while
  `/notifications` renders in place with a "Sign in to see your
  notifications." message.
- **Empty-state treatment mirrors what's already shipped**: a muted
  icon above a short centered message, the same shape as
  `Leaderboard`'s solo-user placeholder and the `/discussions` feed's
  empty state — `MessageSquare` (Discussion tab) and `Inbox`
  (Submissions tab).
- **About/meta copy**: dropped "LeetCode-style" from both the About
  page and the site's `<meta description>` (`app/layout.tsx`);
  replaced the hardcoded "9 problems (Easy and Medium so far)"
  sentence — which required an async `listProblems()` call just to
  compute — with static, evergreen phrasing ("New problems are
  shipping regularly, with harder ones on the way"), simplifying
  `about/page.tsx` back to a plain sync component.

## What shipped

- `db/migrations/0008_comments_user_delete.sql` (new).
- `web/backend/comments.py` — `_author_dict()` helper; both queries
  LEFT JOIN `users` and select `u.id` to distinguish "no user" from "a
  user with a null display_name."
- `web/frontend/src/lib/comments-api.ts` — `CommentAuthor.public_id`
  now `string | null`.
- `web/frontend/src/components/discussion-thread.tsx`,
  `problem-submissions.tsx` — icon+message empty states.
- `web/frontend/src/components/notification-menu.tsx` — signed-out
  early return to a plain link; dead dropdown branch removed.
- `web/frontend/src/app/(account)/layout.tsx` — `PUBLIC_ACCOUNT_ROUTES`
  allowlist, fallback sidebar block for no-user state.
- `web/frontend/src/app/(account)/notifications/page.tsx` — real
  signed-out empty state instead of `return null`.
- `web/frontend/src/app/about/page.tsx`, `web/frontend/src/app/layout.tsx`
  — copy changes described above.

## Verification

Against the real local stack:

- Full deleted-account lifecycle with two synthetic accounts: posted a
  top-level comment (u1) and a reply (u2), u2 upvoted u1's comment,
  then deleted u1's user row directly. Confirmed via
  `GET /problems/{slug}/comments` and `GET /discussions` that the
  comment and reply both survive, author is now
  `{"display_name": "deleted user", "avatar_url": null, "public_id":
  null}`, u2's upvote is untouched, and u1's own
  `comment_votes` rows are gone (`SELECT ... WHERE user_id = <deleted>`
  returned empty) while the comment rows themselves remain
  (`user_id` now `NULL`, body untouched).
- Real Playwright pass: signed-out bell click lands on `/notifications`
  directly (`page.url()` confirmed, no bounce), with a graceful
  sign-in message and the sidebar's "Sign in to see your account."
  fallback; a separate check confirmed `/profile` still redirects a
  signed-out visitor to `/problems` exactly as before. Both empty
  states (Discussion, Submissions) render with the new icon+message
  treatment. About page renders the updated copy with zero "LeetCode"
  mentions anywhere in the frontend (confirmed via a full source grep)
  and no hardcoded problem count.
- `npx eslint` + `npx tsc --noEmit` clean on every touched file.
  Backend syntax-checked, restarted cleanly, migration applied on
  startup.
- All synthetic accounts, sessions, and comments deleted after
  verification.

## Explicitly out of scope
- Any visual "this user was deleted" badge beyond the synthesized name
  — not asked for, and the existing rendering already handles it via
  the same path as any other author.
- Extracting `/notifications` to a fully standalone route — the
  allowlist is smaller and keeps the sidebar for everyone signed in.
