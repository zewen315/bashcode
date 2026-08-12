# 0001 — PostgreSQL + auth schema (prep for login)

Status: **Implemented and deployed.**

## Context

User accounts are the next feature after this one. Before this task,
"solved/starred/activity" all lived in `localStorage`
(`local-progress.ts`) only, and there was no persistence layer at all —
problems were read off disk on every request, submissions weren't
recorded anywhere server-side. The decision was made to stand up
Postgres now, ahead of building login itself, so the login task ([see
0002](./0002-oauth-login-sessions.md)) would have real infrastructure
to build against instead of doing both at once.

Confirmed decisions at the time:
- **Auth providers**: GitHub OAuth and Google OAuth, both from day one.
- **Postgres hosting**: self-hosted in `docker-compose`, on the same
  droplet (resized 1GB → 2GB to make room).
- **Schema scope for this task**: auth only (`users`, an
  OAuth-identity-linking table, `sessions`). Explicitly **not**
  solved/starred/activity tables — migrating those off `localStorage`
  is a deliberate, separate later task.
- **This task's deliverable**: Postgres running in compose, a migration
  mechanism, the three tables below, and DB plumbing in the backend.
  **Not** OAuth callback routes, session-cookie middleware, or any
  frontend sign-in UI — those became task 0002.

## Design decisions worth knowing (why, not just what)

- **Sync throughout, no async/await**: this backend's FastAPI routes
  are deliberately synchronous (sync routes run in Starlette's
  threadpool, which is why the concurrency limiter for judge runs uses
  `threading.Semaphore` instead of `asyncio.Semaphore`). DB code
  matches this: `psycopg` (v3) sync API, not `asyncpg`.
- **A connection pool is not overkill**: even though judge execution is
  gated to 4 concurrent, ordinary sync routes still run under
  Starlette's default threadpool (cap 40), so concurrent DB-touching
  requests are real. `psycopg_pool.ConnectionPool(min_size=1,
  max_size=5, open=False)` — small footprint on a memory-tight box,
  `open=False` so it's opened explicitly at startup only after
  migrations succeed.
- **Plain numbered SQL migrations, not Alembic/SQLAlchemy**: matches
  this project's minimal-dependency style (no ORM anywhere). A
  `schema_migrations` tracking table + a ~20-line runner is enough for
  the handful of migrations this app will ever need.
- **`BIGINT GENERATED ALWAYS AS IDENTITY` primary keys, not UUID**: the
  real external identifiers are already
  `oauth_identities.provider_user_id` and `sessions.token` (a separate
  random `secrets.token_urlsafe(32)` value) — the internal user ID is
  never a secret and never exposed as one, so UUID would add
  complexity with no real benefit here.
- **`users.email` is nullable, no uniqueness constraint, deliberately
  not deciding "same email across GitHub and Google auto-links to one
  account" here** — GitHub's OAuth email isn't guaranteed
  present/verified, and auto-linking by email string is a known
  account-takeover vector if done carelessly. That decision was left
  for the login task, where it was made explicitly (see 0002: no
  auto-linking). Costs nothing to leave open; a follow-up migration
  can add a constraint later if ever needed.
- **Sessions are opaque server-side tokens, not JWTs**: trivially
  revocable (`DELETE FROM sessions WHERE user_id = ...` for "log out
  everywhere"), no signing-key management, simpler to reason about.

## Schema

`db/migrations/0001_init_auth.sql`:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         TEXT,                 -- nullable, not unique — see notes above
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE oauth_identities (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL,          -- 'github' | 'google'
  provider_user_id  TEXT NOT NULL,          -- stable id from the provider
  email             TEXT,                    -- provider-reported email at link time (audit trail, separate from users.email)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);
CREATE INDEX idx_oauth_identities_user_id ON oauth_identities(user_id);

CREATE TABLE sessions (
  token       TEXT PRIMARY KEY,        -- secrets.token_urlsafe(32), app-generated
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

## What shipped

- `web/backend/db.py`: connection pool + migration runner
  (`run_migrations()`, retry-with-backoff against a cold Postgres,
  advisory-lock guarded, idempotent on every startup).
- `docker-compose.yml`: `postgres` service (16-alpine, healthcheck via
  `pg_isready`, loopback-only published port, `max_connections=20`),
  `backend` service wired to it via `DATABASE_URL` and
  `depends_on: postgres: condition: service_healthy` (long mapping
  form — compose rejects mixing short-list and mapping form on one
  service).
- `.env.example`: `POSTGRES_USER/PASSWORD/DB` with `:-bashcode`
  zero-config local-dev defaults; production must override
  `POSTGRES_PASSWORD` to a real secret.
- `infra/DEPLOY.md`: droplet resize to 2GB as a manual prerequisite,
  migrations run automatically on every backend startup.

## Bugs caught before/during shipping

- Dockerfile wasn't copying the new `db/` directory into the image —
  `run_migrations()` would have found an empty `db/migrations/` and
  silently treated that as "nothing to apply." Fixed with
  `COPY db/ db/`.
- Local dev's `.env`-less Postgres startup failed on an empty password
  — the official Postgres image refuses to start with no superuser
  password set. Fixed via `${POSTGRES_USER:-bashcode}` etc. defaults in
  `docker-compose.yml`.
- The droplet's `.env` was missing `POSTGRES_USER/PASSWORD/DB` entirely
  before the first deploy — caught via `grep -o '^[A-Z_]*=' .env` on
  the droplet before bringing the stack up.

## Explicitly out of scope (deferred to later tasks)

- OAuth client registration/callback routes, session-cookie middleware,
  frontend sign-in UI — became [0002](./0002-oauth-login-sessions.md).
- The `users.email` uniqueness/auto-linking decision — resolved in
  0002 (no auto-linking).
- Migrating solved/starred/activity off `localStorage` into Postgres —
  still a separate, later task as of 0002.
