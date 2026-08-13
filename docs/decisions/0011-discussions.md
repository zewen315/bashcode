# 0011 — Per-problem discussions + aggregated Discussions feed

Status: **Implemented and verified locally. Not yet deployed.**

## Context

Two items from an earlier "next we support" request were still
outstanding after 0009 shipped solutions and tools/topics-in-description:
per-problem discussion threads (markdown editor, likes/dislikes, replies,
collapse/expand) and a page aggregating discussion activity across all
problems. Both existed only as placeholders — `DiscussionPlaceholder` in
`problem-page-layout.tsx` and a static "Coming soon" `app/discussions/
page.tsx` — and the `/problems` table's per-row Discuss icon linked
everyone to the generic `/discussions` page instead of that problem's
own thread.

Confirmed via AskUserQuestion:
- **Single-level threading** — top-level comments can have replies;
  replies cannot have replies.
- **Delete only, no edit** — author can soft-delete their own comment.
- **`/discussions` is a recent-activity feed**, not a per-problem index.
- (Carried over from an earlier session) markdown textarea + rendered
  preview for the composer; hide/show = pure UI collapse/expand.

## Design decisions worth knowing

- **Reading is public; posting/replying/voting/deleting requires
  sign-in** — matches every other cross-user feature this session.
  `GET` endpoints call `auth.get_user_id_or_none` (never raise);
  mutations call `auth.require_user_id` (401 if signed out) — the exact
  pattern already established in `progress.py`.
- **Single-level threading is enforced server-side**, not just hidden
  in the UI: `POST .../comments` 400s a reply whose target parent
  itself already has a `parent_id`. Verified directly via curl — u1
  replying to u2's reply returned 400.
- **Votes are a signed value per (comment, user)**
  (`comment_votes(comment_id, user_id, value CHECK IN (1,-1))`),
  upserted via `ON CONFLICT ... DO UPDATE`, not two separate counters —
  counts computed live with `COUNT(*) FILTER (...)` at read time. This
  platform's scale doesn't justify denormalized counters. Verified the
  full lifecycle via curl: vote, change vote, un-vote, each reflected
  correctly in the next `GET`.
- **Delete blanks the body server-side**
  (`UPDATE comments SET deleted_at = now(), body = '[deleted]' WHERE id
  = %s AND user_id = %s`), not just client-side hiding — the row stays
  (replies aren't orphaned) but the real text is never returned again.
  Verified: after delete, a subsequent `GET` shows `"body": "[deleted]"`
  for the author's own request too, and a second delete attempt 404s.
  A non-owner's delete attempt also 404s (not 403, to avoid confirming
  the comment's existence to a non-owner).
- **No new markdown plugin** — reused the exact bare
  `<ReactMarkdown>{body}</ReactMarkdown>` pattern already used
  everywhere else in the app (`problem-description.tsx`,
  `problem-solution.tsx`, the legal pages). Confirmed via exploration
  that `package.json` has no `rehype-raw`/`rehype-sanitize` anywhere,
  so raw HTML in a pasted comment is already stripped by default —
  deliberately never added a raw-HTML plugin for comments, since that
  would turn pasted HTML into an XSS vector.
- **Reused existing primitives rather than inventing new ones**:
  `Textarea`, `Tabs` (Write/Preview toggle), `AlertDialog` (Settings'
  own "Reset your coding history?" pattern, reused verbatim for
  "Delete this comment?"), `relativeTime()`, and the star-toggle's
  icon-button convention (raw `<button>` + conditional fill color)
  mirrored for the like/dislike buttons.
- **`/discussions` feed pagination is keyset** (`GET /discussions?
  before=<id>`), not offset — avoids the duplicate/skipped-row drift
  offset pagination gets as new comments land. Verified with 22 seeded
  top-level comments: page 1 returned ids 24→5 with `next_cursor: 5`,
  page 2 returned 4,3 with `next_cursor: null` — no overlap, no gaps,
  and the one soft-deleted top-level comment was correctly absent from
  both pages.
- **Feed items resolve a problem title from the filesystem repo**
  (`bashcode-problems`, not Postgres) via a small `_problem_title()`
  helper in `comments.py` that mirrors `main.py`'s `PROBLEMS_DIR`
  computation — duplicated rather than imported from `main`, since
  `main.py` already does `import comments`, so importing back would be
  circular.
- **Discuss icon now deep-links**: `problems-explorer.tsx`'s per-row
  icon points to `/problems/{slug}?tab=discussion` instead of the
  generic `/discussions`; `problem-page-layout.tsx`'s `leftTab` state
  now reads its initial value from `useSearchParams().get("tab")`.
  Verified by clicking the icon in a real browser pass and landing
  directly on the Discussion tab, state intact.

## Schema — `db/migrations/0006_comments.sql`
`comments` (self-referential `parent_id`, `slug` as free text like
`submissions.slug` — problems live on disk, never in Postgres) and
`comment_votes` (composite PK `(comment_id, user_id)`).

## What shipped

- `db/migrations/0006_comments.sql` (new).
- `web/backend/comments.py` (new) — `GET`/`POST
  /problems/{slug}/comments`, `DELETE /comments/{id}`, `POST`/`DELETE
  /comments/{id}/vote`, `GET /discussions`. Registered in `main.py`.
- `web/frontend/src/lib/comments-api.ts` (new) — fetch wrappers.
- `web/frontend/src/components/comment-composer.tsx` (new) — Write/
  Preview markdown editor, reused for both top-level and inline reply
  composition.
- `web/frontend/src/components/comment-item.tsx` (new) — renders one
  comment plus (for top-level ones) its replies, vote buttons, reply
  toggle, collapse/expand, and the delete confirm dialog.
- `web/frontend/src/components/discussion-thread.tsx` (new) — the real
  per-problem tab content, replacing `DiscussionPlaceholder`.
- `web/frontend/src/app/discussions/page.tsx` — rewritten from a
  static "Coming soon" page into the real paginated feed.
- `web/frontend/src/components/problem-page-layout.tsx`,
  `problems-explorer.tsx` — wiring described above.

## Verification

Against the real local stack (uvicorn + Next dev + Postgres):

- Full curl lifecycle with two synthetic accounts
  (`auth._get_or_create_user()`): post, reply, reply-to-reply rejected
  (400), vote/change-vote/un-vote, delete (body blanked, replies
  survive, non-owner and double-delete both 404), 22-comment keyset
  pagination test on the feed.
- Real Playwright pass (cookie-injected sessions, no OAuth): signed-out
  read-only thread with sign-in prompt, signed-in posting/replying/
  voting/collapsing/deleting with the confirm dialog, the `?tab=
  discussion` deep link from the `/problems` table, and both the empty
  and populated states of the `/discussions` feed. Zero console errors
  across every screenshot.
- `npx eslint` and `npx tsc --noEmit` clean on every new/touched file
  (one pre-existing, unrelated `set-state-in-effect` violation in
  `problems-explorer.tsx` left alone per established policy).
- All synthetic accounts, sessions, comments, and votes deleted after
  verification.

## Explicitly out of scope
- Comment editing (delete-only, per the confirmed answer).
- Nesting beyond one level.
- Rate limiting / spam prevention beyond a max body length (10,000
  chars) — no existing rate-limit infra in this app to hook into.
- A live comment-count badge on the `/problems` table — the Discuss
  icon is now a correct deep link, not a counter; a reasonable
  follow-up, not requested here.
