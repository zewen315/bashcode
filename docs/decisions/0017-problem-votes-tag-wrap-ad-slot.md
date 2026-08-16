# 0017 — Problem voting, tag-list wrapping, and an ad-slot placeholder

Status: **Implemented and verified locally. Not committed.**

## Context

Three small, unrelated UI/product requests in one pass:
1. The sidebar Tools/Topics filter chips were a single horizontally-
   scrolling row with the scrollbar hidden — no visible cue that more
   tags existed off-screen. Wrap instead, but since a long tag list
   can still exceed a sane widget height, cap it and signal
   "more below" visually.
2. Let signed-in users upvote/downvote a problem itself (not just
   comments), from the Description tab; anonymous users see a
   sign-in prompt instead of live controls.
3. Reserve space for an ad above the Solution tab's text — no real ad
   network wired yet, just the placeholder and layout.

## Design decisions worth knowing

- **Problem votes reuse the exact `comment_votes` shape** — a signed
  `value IN (1, -1)` per `(slug, user_id)`, counts computed live via
  `COUNT(*) FILTER (WHERE value = ...)` rather than maintained
  counters. `slug` is free text, not a FK, same convention as
  `comments.slug`/`submissions.slug` — problems live on disk, never
  in Postgres.
- **No `my_vote` embedded in `GET /problems/{slug}`.** That endpoint
  is fetched server-side (Next.js SSR → FastAPI directly via
  `NEXT_PUBLIC_API_URL`), which never carries the browser's session
  cookie — embedding `my_vote` there would always read anonymous
  regardless of who's actually signed in. Votes are fetched
  client-side instead (`ProblemVotes` component, mirrors
  `DiscussionThread`'s self-fetching pattern) against a new `GET
  /problems/{slug}/vote`, proxied same-origin through `/api/...` so
  the cookie is actually present.
- **Vote/unvote responses return the fresh counts directly** (same
  as `vote_comment`/`unvote_comment`), so the client updates from the
  response body with no extra round trip.
- **No notifications on problem votes** — unlike comment likes
  (0015), a problem has no single "author" user to notify. Out of
  scope entirely here.
- **Tag-list wrapping**: `ProblemTags` switched from
  `overflow-x-auto` + `scrollbar-hide` to `flex-wrap` inside a
  `max-h-28 overflow-y-auto` box. A `ResizeObserver` + `scroll`
  listener tracks whether `scrollHeight - clientHeight - scrollTop >
  4` and conditionally renders a bottom-anchored fade + bouncing
  chevron (click scrolls down 40px) — only when there's actually more
  to see, confirmed by forcing overflow at a 380px viewport (chevron
  appeared, tags below the fold became reachable) and confirming it's
  absent at 1280px where 18 tools tags fit in two lines with room to
  spare.
- **Ad slot is fully wired**, real publisher and real ad unit.
  `app/layout.tsx` loads `adsbygoogle.js` site-wide via `next/script`
  (`strategy="afterInteractive"`) with publisher `ca-pub-9510918227818625`.
  `AdSlot` takes an optional `slot` prop and pushes `(adsbygoogle =
  window.adsbygoogle || []).push({})` in a `useEffect` when one's
  provided; `ProblemSolution` now passes the real "Problem Solution"
  ad unit's id, `4734139237`. With no `slot` (any future call site
  that doesn't have a unit yet), it still falls back to the dashed
  "Advertisement" placeholder, since an `<ins>` with no slot id never
  fills. Real ads only ever serve on AdSense's approved production
  domain, never localhost, so the actual ad render can't be verified
  locally — confirmed instead by matching the component's output
  against the exact snippet AdSense generated for this unit (same
  `data-ad-client`/`data-ad-slot`/`data-ad-format`/
  `data-full-width-responsive`, same push-on-mount timing).

## Schema

`db/migrations/0012_problem_votes.sql` — new `problem_votes(slug,
user_id, value)` table, `PRIMARY KEY (slug, user_id)`, `value CHECK
(value IN (1, -1))`, indexed on `slug`.

## What shipped

- `web/backend/problem_votes.py` (new) — `vote_counts()` helper plus
  `GET`/`POST`/`DELETE /problems/{slug}/vote`.
- `web/backend/main.py` — router registered; `get_problem()` itself
  is unchanged (see the `my_vote`-embedding note above for why).
- `web/frontend/src/lib/problem-votes-api.ts` (new) — thin fetch
  wrappers, same shape as `comments-api.ts`'s vote functions.
- `web/frontend/src/components/problem-votes.tsx` (new) — the
  upvote/downvote widget + sign-in placeholder, mounted at the bottom
  of `ProblemDescription`.
- `web/frontend/src/components/problem-tags.tsx` — wrap + scroll-hint
  behavior described above.
- `web/frontend/src/components/ad-slot.tsx` (new) + wired into
  `ProblemSolution`.
- `web/frontend/src/app/layout.tsx` — real AdSense loader script
  (`next/script`, `afterInteractive`), publisher `ca-pub-9510918227818625`.

## Verification

Against the real local stack (Postgres already running locally;
backend/frontend run bare, not via `docker compose`, since local
OAuth secrets aren't configured):
- Migration applied cleanly on backend startup; `problem_votes` table
  confirmed via `psql`.
- Vote lifecycle verified via direct `curl` against the real
  endpoints: anonymous `GET` returns public counts with `my_vote:
  null`; anonymous `POST`/`DELETE` correctly `401`; a synthetic
  signed-in user's `POST` (upvote → switch to downvote → unvote) each
  returned the correct updated counts.
- Full Playwright pass (real browser, not just `curl`) against both
  an anonymous context and a context with an injected session cookie:
  anonymous Description tab shows inactive vote buttons + "Sign in to
  vote on this problem."; the signed-in context shows an active
  avatar, no sign-in prompt, and clicking Upvote updates the count
  live. Solution tab confirmed to render the "Advertisement" slot
  before the markdown text. Tools/Topics chips confirmed wrapping to
  multiple lines (screenshot) and the scroll chevron confirmed
  present only when content actually overflows (380px viewport) and
  absent when it doesn't (1280px).
- `npx tsc --noEmit` clean. All synthetic DB rows (test user, oauth
  identity, session, problem_votes row) removed after verification.

## Explicitly out of scope
- Enabling AdSense's "Auto ads" (a dashboard setting, not code) —
  independent of the manual placement already wired; not requested.
- Additional ad placements beyond the Solution tab.
- Notifications on problem votes.
- Showing `my_vote` in the SSR-rendered page (would need a different
  data-fetching approach entirely, e.g. reading the cookie in a
  Server Component and forwarding it — not attempted here).

## Deploy status
Not committed yet — matches this session's established cadence of
committing/deploying only when explicitly asked.
