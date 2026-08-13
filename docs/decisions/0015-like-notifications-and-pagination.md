# 0015 — Like notifications, removable notifications, real pagination

Status: **Implemented and verified locally. Committed, not deployed.**

## Context

Follow-up feedback on 0014's notification system: it correctly handles
global announcements (no link) and reply notifications (named, linked),
but was missing a third event — someone liking your comment — plus two
general capabilities: removing a notification, and paging past the
first handful once there are more.

## Design decisions worth knowing

- **Likes reuse the exact same `notify.create_notification()` +
  `notifications` table from 0014** — no new table, fired from
  `vote_comment()` in `comments.py`, same shape as the reply hook
  (best-effort, skipped for a deleted author or a self-like).
- **Only a genuine transition to "liked" fires it.** The vote endpoint
  upserts via `ON CONFLICT DO UPDATE`, which "succeeds" even re-
  submitting the same value — so the handler now looks up the
  *previous* vote value first and only notifies when it's actually
  becoming `1` (previous was `NULL` or `-1`). Verified directly: a
  re-click of an already-active like produced zero new notifications;
  switching dislike→like produced one; switching like→like (no-op)
  produced none; liking your own comment produced none.
- **The like notification body never names the liker** — "Your
  comment received a like." (fixed text), the one deliberately
  impersonal notification in this app, versus the reply notification's
  "{name} replied to your comment on {problem}." Confirmed via the
  actual stored/returned body text, not just intent.
- **Removal is two different operations behind one endpoint.**
  Personal notifications (`n`-prefixed) are real per-user rows —
  `DELETE /notifications/{id}` just deletes it. Announcements
  (`a`-prefixed) have no per-user row at all by design (that's the
  point of the broadcast model) — removing one for yourself sets a new
  `hidden_at` marker on the same `announcement_reads` join row
  `mark_read` already uses (added via
  `0011_notification_removal.sql`). Verified: removing an announcement
  hid it from the remover's own listing while it stayed fully visible
  to a second account that hadn't touched it.
- **Removal UI only exists on the full `/notifications` page, not the
  bell dropdown.** Dropdown rows are already single interactive
  elements (some render as `<a>` via `render={<Link/>}`) — nesting a
  second clickable delete control inside one is an invalid-HTML/
  accessibility problem for little benefit in a compact preview that
  already has "View all notifications" as its escape hatch. The full
  page's rows aren't nested that way, so the remove button sits as a
  plain sibling (`flex items-center gap-2` wrapping the row content
  and an `X` button side by side) — no `stopPropagation` needed.
- **Pagination keys off `created_at`, not `id`.** The merged list
  spans two tables with independent id sequences (`a12`/`n34`), so
  there's no shared monotonic id to page on, but timestamps compare
  directly across both. `GET /notifications?before=<epoch ms>` wraps
  the existing `UNION ALL` in a subquery filtered by `created_at <
  before`, same `next_cursor`-only-on-a-full-page convention the
  discussions feed already established. Verified with 25 seeded
  notifications: page 1 returned exactly 20 with a non-null cursor,
  page 2 returned the remaining 5 with `next_cursor: null`, no
  overlap.
- **The bell dropdown is unaffected** — it still calls the same
  endpoint with no `before` (first page, sliced to 5 client-side) and
  gained nothing new; hidden announcements simply stop appearing there
  too, for free, once the backend excludes them.
- **The `/notifications` page pager mirrors `discussions-feed.tsx`
  exactly**: pages cached client-side by index, Prev never re-fetches,
  only advancing into an unseen page hits the network.

## Schema

`db/migrations/0011_notification_removal.sql` —
`announcement_reads.hidden_at TIMESTAMPTZ` (nullable).

## What shipped

- `web/backend/comments.py` — `vote_comment()` now looks up the
  comment's author/slug and the voter's previous value, fires a
  best-effort "New like" notification on a genuine new like.
- `web/backend/notifications.py` — `list_notifications()` gained
  `before` pagination and an `ar.hidden_at IS NULL` filter; new
  `DELETE /notifications/{id}` (deletes personal rows, hides
  announcements per-user).
- `web/frontend/src/lib/notifications.ts` — `fetchNotificationsPage()`,
  `removeNotification()`, `next_cursor` on the response type.
- `web/frontend/src/app/(account)/notifications/page.tsx` — rewritten
  with the cached-page pager and a per-row remove button.

## Verification

Against the real local stack — full detail in the plan's verification
section, all confirmed via direct `curl` against the real endpoints
(not just code review) and a real Playwright pass on the paged page:
like-notification lifecycle (new/no-op/re-notify/self-skip), 20+5
pagination split with correct cursors, personal-delete vs.
announcement-hide-per-user, and the page's Prev/Next/remove controls
all working with zero console errors. `npx eslint` + `npx tsc
--noEmit` clean; backend restarted cleanly, migration applied on
startup. All synthetic accounts/data removed after verification.

## Explicitly out of scope
- Remove/dismiss controls in the bell dropdown itself.
- A bulk "remove all" action (per-item only; `mark_all_read` already
  covers bulk read).
- Notifying on dislikes or notifying the liker.
- Aggregating repeated likes on one comment into a single notification.

## Deploy status
Committed and pushed to GitHub — **not deployed**, matching this
session's established cadence of deploying only when explicitly asked.
