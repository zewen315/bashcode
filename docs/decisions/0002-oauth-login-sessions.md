# 0002 — GitHub + Google OAuth login with server-side sessions

Status: **Implemented, verified locally short of live provider consent.
Not yet deployed.**

## Context

BashCode had no real accounts before this — "solved/starred/activity"
lived in `localStorage` (`local-progress.ts`) and `profile-menu.tsx`
showed a fake `DemoUser` stand-in (`demo-user.ts`) explicitly labeled
as a placeholder. [0001](./0001-postgres-auth-schema.md) stood up
Postgres and an auth schema (`users`, `oauth_identities`, `sessions`)
specifically to prepare for this task, and GitHub/Google OAuth apps
were already registered with real client IDs/secrets sitting in the
droplet's `.env` and wired into `docker-compose.yml`. This task is the
login/session flow itself: OAuth callback routes, session-cookie
handling, and a real sign-in UI.

**Explicitly out of scope**: migrating `localStorage` solved/starred/
activity data into Postgres — that's a separate, later task.

**Confirmed decision: no account auto-linking across providers.**
Signing in with GitHub, then later Google, with the same email creates
two separate accounts. Auto-linking by email is a known
account-takeover vector when a provider doesn't guarantee the email is
verified (notably GitHub) — kept simple and safe for V1; can add an
explicit "link another provider while signed in" feature later if
users actually ask for it.

## Design decisions worth knowing (why, not just what)

- **Cookie-based sessions (HttpOnly), not a bearer token in
  localStorage.** This app executes arbitrary user-submitted judge
  code, and there's real concern about attacks on the site. HttpOnly
  cookies resist XSS-based token theft in a way a localStorage token
  never can. `sessions.token` (schema PK, `secrets.token_urlsafe(32)`)
  is stored as plaintext in the DB — the DB is loopback-only/not
  internet-reachable, so this is an accepted V1 tradeoff, not an
  oversight.
- **Same-origin trick to keep this simple in both dev and prod,
  instead of dealing with cross-origin cookies.** In prod, Caddy
  already proxies `/api/*` and the frontend under one domain
  (`bashcode.net`) — `handle /api/*` and `handle {}` in
  `infra/Caddyfile` are mutually exclusive, so `/api/*` never reaches
  the `frontend` container. Locally, frontend (`next dev`, :3000) and
  backend (`uvicorn`, :8123) run as separate origins. Fix: a
  `rewrites()` entry in `next.config.ts` mapping `/api/:path*` → the
  local backend, and only the new auth calls use a relative
  `/api/auth/...` path instead of the existing absolute
  `NEXT_PUBLIC_API_URL`-based pattern. This makes every auth fetch
  same-origin in both environments — in prod because Caddy already
  unifies the origin (the Next rewrite is simply never exercised
  there), in dev because of the new rewrite. Same-origin fetches send
  cookies by default (fetch's default `credentials` is
  `"same-origin"`), so no CORS `allow_credentials` change is needed —
  this traffic never crosses an origin boundary. Existing non-auth
  endpoints (`listProblems` etc.) are untouched.
- **`PUBLIC_BASE_URL` new env var** (`https://bashcode.net` prod,
  `http://localhost:3000` local dev) is the single source of truth for
  three things: computing each provider's `redirect_uri`, the
  post-login redirect target, and whether to set the cookie `Secure`
  flag. Deliberately NOT derived from `request.url.scheme` — behind
  Caddy the backend always sees plain HTTP regardless of the
  public-facing scheme, so that would silently disable `Secure` in
  production.
- **No user-controlled redirect target anywhere** (avoids open
  redirect) — login always lands back on a fixed `/problems`, no
  "return to where you were" for V1.
- **`SameSite=Lax` on both the `oauth_state` and `session` cookies —
  not `Strict`.** The OAuth callback is a cross-site top-level GET
  navigation initiated by GitHub/Google landing on our callback URL.
  `Strict` would not send the `oauth_state` cookie on that navigation,
  silently breaking every login with a false "state mismatch." `Lax`
  permits cookies on top-level cross-site GET navigations but still
  blocks them on cross-site POST/fetch, which is also why
  `POST /auth/logout` needs no separate CSRF token.
- **Per-provider `oauth_state` cookie names** (`oauth_state_github` /
  `oauth_state_google`), not one shared name — avoids a bug where
  starting a GitHub login in one tab and a Google login in another
  overwrites the first tab's state cookie and breaks its callback.
- **GitHub requires an explicit `User-Agent` header on API calls or it
  hard-rejects with 403 "Missing User Agent"** — same header already
  added for the Resend integration (`main.py`'s `_send_feedback_email`)
  for a Cloudflare-block reason; GitHub's requirement is separate and
  stricter (documented API requirement, not just a bot heuristic).
  Reused the same `"BashCode-Backend/1.0"` UA on both the
  token-exchange and `/user` calls.
- **Google's authorize URL requests `scope=openid email profile`** —
  `openid` isn't optional: `openidconnect.googleapis.com/v1/userinfo`
  is an OIDC endpoint and expects a token issued under an OIDC flow.
  GitHub's scope is just `read:user` — deliberately skipping
  `user:email` and the extra `/user/emails` call, since `users.email`
  is nullable by design and this avoids an extra API round-trip for a
  field that's optional anyway.
- **`/auth/me` is not rate-limited** — it's called on every
  `ProfileMenu` mount (effectively every page navigation), so reusing
  the existing judge/feedback rate limiter (10 req/60s) would trip for
  normal browsing. Only `/auth/{provider}/callback` is rate-limited
  (cheap check, first thing in the handler, before any outbound HTTP
  call to the provider).
- **Extracted the existing rate-limit helper into its own module**
  (`web/backend/ratelimit.py`) rather than importing it from `main.py`
  into the new `auth.py` — avoids a circular import (`main.py` imports
  `auth.py`'s router). Purely mechanical: `_client_ip`,
  `_check_rate_limit`, and their module-level state moved verbatim, no
  behavior change.
- **First real `db.pool` consumer in the codebase** — until this task,
  `db.pool.open()`/`close()` were the only references; nothing had ever
  run a real query against it. Verified via a real manual test (not
  just inspection) that `pool.connection()`'s commit/rollback semantics
  work as expected.
- **`AvatarImage` already existed and needed zero new code** —
  `ui/avatar.tsx` already exported a working `AvatarImage` wrapping
  base-ui's `Avatar.Image` primitive (handles fallback-on-load-failure
  itself); `profile-menu.tsx` just wasn't using it yet. Not a
  `next/image` component, so no `next.config.ts` `images.remotePatterns`
  needed for `avatars.githubusercontent.com`/`lh3.googleusercontent.com`.
- **Null-safe `display_name`** — schema allows `users.display_name` to
  be `NULL`; the frontend guards against this (GitHub always has
  `login` as a non-null fallback and Google's `profile` scope always
  returns `name`, but the schema allows null so the code does too).
- **No dedicated `/login` page** — sign-in buttons live directly in the
  `ProfileMenu` dropdown (GitHub/Google links when signed out, avatar +
  sign-out when signed in), matching the existing dropdown-based UX the
  demo stand-in already used.
- **No new DB migration, no new Python dependency.** The existing
  schema from 0001 is sufficient as-is; outbound HTTP uses stdlib
  `urllib` (matching the Resend precedent) — `secrets` (stdlib) for
  state/tokens.

## What this shipped (or is shipping)

- `web/backend/ratelimit.py` (new) — mechanical extraction of the rate
  limiter from `main.py`.
- `web/backend/auth.py` (new) — `APIRouter(prefix="/auth")`:
  `GET /{provider}/login`, `GET /{provider}/callback`, `GET /me`,
  `POST /logout`.
- `web/backend/main.py` — includes the auth router, updated rate-limit
  import.
- `.env.example`, `docker-compose.yml` — new `PUBLIC_BASE_URL` var.
- `web/frontend/next.config.ts` — local-dev-only `/api/*` rewrite.
- `web/frontend/src/lib/auth.ts` (new) — `getCurrentUser()`,
  `signOut()`, login URL constants.
- `web/frontend/src/components/profile-menu.tsx` — real sign-in/out UI,
  replacing the `demo-user.ts` stand-in (deleted).

## Explicitly out of scope for this task

- Migrating `localStorage` solved/starred/activity data into Postgres
  — separate, later task.
- A "return to where you were before logging in" redirect — avoided
  deliberately to sidestep open-redirect risk; always lands on
  `/problems`.
- Hashing `sessions.token` before storing — accepted V1 tradeoff (see
  design notes above).
- Updating `README.md`'s stale "Auth/accounts: out of scope for V1"
  line — not required for this task, low priority.
- Any UI/logic beyond the `ProfileMenu` dropdown (no dedicated
  `/login` page, no settings page for connected accounts).
