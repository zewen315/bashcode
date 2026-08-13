# BashCode — Project Guide for Coding Agents

## What this is
A hands-on practice platform for Bash scripting, at bashcode.net.
Problems are multi-step/practical, not single-command drills. Judge
evaluates output/behavior, NOT which commands were used — multiple
correct solutions must pass.

## Non-negotiable principles
- Judge results, never required commands or command-name matching.
- Every submission is untrusted/potentially malicious code. No exceptions.
- Keep it boring and simple. No microservices, Kubernetes, Kafka.
- Anything non-trivial gets a decision doc in `docs/decisions/` — see
  "Decision log" below. Read the relevant ones before touching a
  feature; don't rely on this file for that kind of detail.

## Stack
- Frontend: Next.js (App Router) + TypeScript + Tailwind + Base UI
  primitives + Monaco Editor
- Backend: FastAPI (sync, no asyncio)
- DB: PostgreSQL, schema-migrated via `db/migrations/*.sql` (applied
  automatically on backend startup, see `db.py`'s `run_migrations()`)
- Judge: Python + Docker (MVP-level isolation only), run synchronously
  — no queue; only add one if concurrency actually demands it
- Deploy: Docker Compose on a DigitalOcean Droplet, behind Caddy
- DNS/CDN: Cloudflare

## Architecture
```
Next.js → FastAPI → PostgreSQL
Submission → Judge (Python) → disposable Docker sandbox
```

## Judge sandbox requirements (hard requirements, not optional)
Every execution must be:
- `--network=none`
- non-root user
- no secrets/env leakage into container
- CPU / memory / PID limits set
- hard wall-clock timeout, force-kill on expiry
- read-only or minimal writable scratch space
- capabilities dropped (`--cap-drop=ALL`)
- fully disposable (fresh container per submission, destroyed after)

Docker is MVP-acceptable but not a real hostile-code security boundary.
If real user traffic arrives: separate judge service from web server,
evaluate gVisor/Firecracker.

## Repo layout (split across two repos)
`bashcode` is **public** (app code, no problem content ever lands here).
`bashcode-problems` is **private** (test cases + solutions must never be
public, or submissions become answer lookups) — pulled onto the droplet
via a read-only SSH deploy key, `git pull`'d alongside this repo on
every deploy.

```
bashcode/                  (public)
├── web/
│   ├── frontend/
│   └── backend/
├── judge/
├── db/migrations/          sequential schema migrations, applied on startup
├── docs/decisions/         ADR-style log — why each feature exists, not just what shipped
├── infra/
└── docker-compose.yml

bashcode-problems/          (private)
└── <slug>/
    ├── problem.md
    ├── config.yaml
    ├── starter.sh
    ├── solution.sh
    ├── solution.md
    └── tests/
```

## Decision log
`docs/decisions/0001...` onward is the durable record of *why* each
feature exists — schema rationale, design tradeoffs, what was
deliberately left out of scope, and how each change was verified
against the real running system. Plan-mode files under `~/.claude/plans/`
are ephemeral and get overwritten every session; this log is not —
it's the actual source of truth for "why does this work this way."

## Core user flow
```
/problems → /problems/[slug] → write Bash in Monaco
→ Run (visible tests) → Submit (hidden tests in sandbox)
→ Accepted / Wrong Answer / Timeout / No Tests Found
```

## What's shipped beyond the core loop
- Accounts (Google/GitHub OAuth), profiles, avatars
- Progress tracking (submissions, starred problems, activity calendar)
  — Postgres-backed when signed in, localStorage when anonymous, with
  merge-on-login
- Per-problem discussions: markdown comments, single-level replies,
  likes, deletion (both self-delete and account-deletion-safe — a
  deleted user's comments survive as "deleted user")
- An aggregated `/discussions` feed and a real cross-user leaderboard
- Notifications: replies, likes, a welcome message on signup, and
  global announcements — merged into one bell/inbox, paginated,
  removable
- Historical submission detail (first failing test, plus the code you
  actually submitted)
- A "Buy Me a Coffee" support page — an external link only, no payment
  processing lives in this app

## V1 problem categories
Bash fundamentals · text processing (grep/sed/awk/cut/sort/uniq) ·
files (find/permissions/timestamps/batch ops) · pipes & redirects/xargs ·
practical scripts (log analysis, cleanup, reports, backups, config
processing).

## Explicitly out of scope (for now)
Kubernetes labs, SRE troubleshooting sims, production simulations, AI
tutor features, microservices, an admin UI for posting announcements
(still a manual `psql` INSERT by design), custom/in-app payment
processing.

## Target users
SRE/production/DevOps/platform/backend-linux engineers; people
interview-prepping for Bash/Linux/SRE roles.

## Success metric
Visit → run → submit → solve → solve again → return. Retention over
pageviews.
