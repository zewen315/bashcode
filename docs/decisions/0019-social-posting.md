# 0019 — Manual Twitter/X posting for the @bashcode account

Status: **Implemented and verified locally (dry-run). Not committed.**
Needs real Twitter API keys before it can actually post — that's an
account-side setup step outside this codebase.

## Context

The @bashcode Twitter/X account exists now. The ask: periodically
tweet a problem to drive traffic, with a generated image (a tweet's
280 characters can't fit a real problem statement) plus a short blurb
and a link back to the site.

Scheduling was considered (cron, "1 post every 3 days") and explicitly
dropped in favor of a fully manual flow: a human decides which problem
to post and when, by asking for it to be run — there's no scheduler,
no auto-rotation, and no "pick the next unposted problem" logic. The
`social_posts` table this uses is a plain history log, not a queue.

## Design decisions worth knowing

- **A dedicated card image, not a screenshot of the real page.**
  Considered screenshotting the actual problem page (via Playwright,
  already used elsewhere in this repo for testing) into one or more
  images. Rejected: Twitter's UI heavily favors the first image in a
  multi-image post, so splitting the statement and example I/O across
  images means most viewers only ever see image one anyway; and the
  real page's height varies wildly per problem (1 example vs. 3),
  which fights a fixed-size social card. Went with one purpose-built
  1200-wide image instead — title, difficulty/tools/topics badges, a
  short hand-written hook, the full example (all input files, not
  just the first, labeled INPUT/OUTPUT), and a
  bashcode.net/problems/&lt;slug&gt; call to action — rendered directly
  with Pillow (already a backend dependency for avatar handling), not
  a headless browser. Avoids adding Chromium to the backend image for
  something that runs on-demand, not continuously.
- **Card height is content-driven, not fixed.** First pass used a
  fixed 1200×675 canvas with a fixed-height example box — broke
  immediately on any problem needing more than one input file (e.g.
  config-diff's old/new config pair): the box was sized before
  knowing how much content it had to hold, so the second file and the
  full output overflowed past its bottom edge and collided with the
  CTA line below it. Fixed by laying out the example box's rows (each
  input file's name + lines, then OUTPUT + its lines) into a flat list
  first, summing their heights to size the box exactly, *then*
  drawing — and by rendering onto an oversized scratch canvas and
  cropping to wherever content actually ends, rather than assuming a
  fixed height up front. 675px tall is only the floor a short card
  still gets; a two-file example like config-diff's genuinely renders
  taller, on purpose.
- **`social_hook` in the problem's own `config.yaml`, not a separate
  curation file.** A short, hand-written one-or-two-sentence blurb —
  the tweet's actual hook text, not a truncation of `problem.md` (the
  full statement is written to be read on the site, not skimmed on
  Twitter). Its presence doubles as the eligibility gate: running the
  script against a problem with no `social_hook` fails fast with a
  clear message, rather than posting something with no real hook text
  or silently falling back to a truncated description.
- **The example shown on the card is `tests/samples/1`** — the exact
  same first-sample data the frontend already shows on the problem
  page's Testcase tab (`get_problem()` in main.py), including the
  `description.md` override for problems where the raw input isn't
  fit to display verbatim (e.g. a filesystem test's setup script).
  Reused that logic rather than inventing a separate "example for
  social" concept.
- **Problem lookup accepts an id, a slug, or an exact title** — since
  this is now something invoked ad hoc ("post problem 12" / "post
  Sum of Squares"), not programmatic, matching on whatever's easiest
  to say is more useful than requiring the exact slug every time.
- **No automatic dedup/blocking on repeats.** `social_posts` records
  every successful post and the script prints a note if a problem was
  already posted before, but still posts again if asked — a human
  decided to run it, so a deliberate repost isn't treated as an error.
- **Twitter/X API**: `tweepy`, OAuth1 user context. Media upload is
  still v1.1-only in tweepy even for a v2-created tweet, so the script
  uses `tweepy.API.media_upload` for the image and `tweepy.Client.
  create_tweet` (v2) for the actual post, passing the v1.1 media id
  across. Four keys required (`TWITTER_API_KEY/SECRET`,
  `TWITTER_ACCESS_TOKEN/SECRET`, see `.env.example`) — the access
  token specifically needs Read **and** Write permissions generated
  from the Twitter Developer Portal (apps default to read-only).

## What shipped

- `db/migrations/0013_social_posts.sql` — `social_posts(id, slug,
  posted_at)`, a plain append-only history log.
- `web/backend/social_post.py` — the script itself: `python
  social_post.py <id-or-slug-or-title> [--dry-run]`. Run via `docker
  compose exec backend python social_post.py ...` — needs
  `BASHCODE_PROBLEMS_DIR`/`DATABASE_URL`, both already set in that
  container's environment for the main app.
- `web/backend/Dockerfile` — added `fonts-dejavu-core` (~5MB), the
  only new system dependency; card rendering needs real font files
  and `python:3.12-slim` ships none.
- `web/backend/requirements.txt` — added `tweepy`.
- `docker-compose.yml` — passes through the four `TWITTER_*` vars to
  the backend service (read only by this script, not the FastAPI app).
- `.env.example` — documents the four `TWITTER_*` vars and where to
  get them.

## Verification

Rebuilt the backend image locally (confirms the font package + tweepy
install cleanly) and ran `social_post.py` inside a throwaway container
against the real local Postgres + bashcode-problems:
- Lookup by id, by slug, and by exact title all resolved the same
  problem.
- A problem with no `social_hook` failed fast with the intended
  message; an unknown identifier did too.
- Generated card images reviewed directly for both a simple one-file
  example (sum-of-squares) and a two-file one (config-diff) — badges,
  title, hook, the full boxed example (both input files labeled, all
  4 output lines), and CTA all render correctly with no clipping or
  overlap in either case, at their own (different) heights.
- Tweet text built and length-checked (under 280).
- Manually inserted a `social_posts` row and confirmed the "already
  posted on ..." note appears but doesn't block a repost.
- Actual posting (`post_tweet`) is **not** verified — no real Twitter
  API keys exist yet to test against; the tweepy call itself is
  straightforward enough (standard v1.1 media + v2 tweet pattern) that
  this is the one part being shipped without an end-to-end test.

## Explicitly out of scope

- Any scheduling/automation — deliberately manual only, per the
  request that walked back the original "every 3 days" idea.
- Auto-selecting which problem to post — a human picks every time.
- Writing `social_hook` for existing problems — that's ongoing
  content work, not part of this change (only `sum-of-squares` has a
  placeholder hook for testing, which should be replaced with a real
  one — or removed — before that problem is actually posted).

## Deploy status

Not committed yet — matches this session's established cadence. Real
Twitter API keys still need to be created (Twitter Developer Portal,
@bashcode account) and added to the droplet's `.env` before this can
actually post anything.
