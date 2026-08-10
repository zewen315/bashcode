# BashCode — Project Spec for Coding Agent

## What this is
LeetCode-style practice platform for Bash scripting, at bashcode.net.
Problems are multi-step/practical, not single-command drills. Judge
evaluates output/behavior, NOT which commands were used — multiple
correct solutions must pass.

## Non-negotiable principles
- Judge results, never required commands or command-name matching.
- Every submission is untrusted/potentially malicious code. No exceptions.
- Keep V1 boring and simple. No microservices, Kubernetes, Kafka.
- Don't build auth, monetization, or SRE/K8s features until core
  problem-solving loop works end to end.

## Stack
- Frontend: Next.js + TypeScript + Tailwind + shadcn/ui + Monaco Editor
- Backend: FastAPI
- DB: PostgreSQL
- Queue: Redis (add only when concurrency needs it, not before)
- Judge: Python + Docker (MVP-level isolation only)
- Deploy: Docker Compose on a DigitalOcean Droplet (1GB acceptable for V1)
- DNS/CDN: Cloudflare

## Architecture
```
Next.js → FastAPI → PostgreSQL
Submission → Queue → Judge Worker → disposable Docker sandbox
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
public, or submissions become answer lookups).

```
bashcode/                  (public)
├── web/
│   ├── frontend/
│   └── backend/
├── judge/
├── infra/
└── docker-compose.yml

bashcode-problems/          (private)
└── <slug>/
    ├── problem.md
    ├── config.yaml
    ├── starter.sh
    ├── tests/
    └── solution.sh
```

`bashcode-problems` is pulled into the judge/ingest environment at
build or deploy time (git submodule pinned to a commit, or a
deploy-time clone with a scoped read-only credential) — never bundled
into the public repo or exposed through any API response.

## Core user flow (build this first, nothing else)
```
/problems → /problems/[slug] → write Bash in Monaco
→ Run (visible tests) → Submit (hidden tests in sandbox)
→ Accepted / Wrong Answer / Runtime Error / Timeout
```

## V1 problem categories
Bash fundamentals · text processing (grep/sed/awk/cut/sort/uniq) ·
files (find/permissions/timestamps/batch ops) · pipes & redirects/xargs ·
practical scripts (log analysis, cleanup, reports, backups, config
processing). Target: "BashCode 50" curated set.

## Explicitly out of scope for V1
Auth/accounts, payments, Kubernetes labs, SRE troubleshooting sims,
production simulations, AI tutor features, microservices.

## Target users
SRE/production/DevOps/platform/backend-linux engineers; people
interview-prepping for Bash/Linux/SRE roles.

## Success metric (only one that matters right now)
100 unrelated users actually submit a problem. Track:
visit → run → submit → solve → solve again → return.
Retention over pageviews. Do not optimize monetization yet.
