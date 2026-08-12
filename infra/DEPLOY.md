# Deploying to the droplet

## One-time setup

1. **Resize the droplet to 2GB RAM** (DigitalOcean dashboard — a manual
   step, not scripted here) *before* bringing up Postgres. The droplet
   was tight at 1GB even before adding a database (see Resource budget
   below); this is a prerequisite, not optional.
2. **DNS**: point `DOMAIN`'s A record at the droplet's IP *before* starting
   Caddy — it requests a Let's Encrypt cert on first boot and the HTTP-01
   challenge will fail if DNS isn't live yet.
3. **Docker**: install Docker Engine + the Compose plugin on the droplet
   (`curl -fsSL https://get.docker.com | sh`; the compose plugin ships
   with it on recent installs — `docker compose version` to confirm).
4. **Firewall**: open 80 and 443 (`ufw allow 80,443/tcp` if using ufw).
5. **Clone both repos under `/root`**, matching `.env.example`'s defaults
   (the exact path matters — see the Docker-outside-of-Docker note below):
   ```
   cd /root
   git clone https://github.com/zewen315/bashcode.git
   git clone https://github.com/zewen315/bashcode-problems.git   # needs a deploy key/PAT — private repo
   mkdir -p /root/bashcode-scratch
   ```
6. **Configure env**: `cp bashcode/.env.example bashcode/.env` and fill in
   real values (see comments in that file). If you clone anywhere other
   than `/root`, update `BASHCODE_PROBLEMS_PATH` and `BASHCODE_SCRATCH_PATH`
   to match — they must be the actual absolute path on the host.
   **Must** set a real `POSTGRES_PASSWORD` here — the `bashcode` default
   in docker-compose.yml exists only so local dev works with no `.env`
   file at all, not for production use.

## Deploy / redeploy

```
cd bashcode
docker compose up -d --build
```

First run also builds and tags `bashcode-sandbox:latest` via the
`sandbox-image` service — required before any submission will judge
correctly.

To pick up new commits later: `git pull` in both `bashcode` and
`bashcode-problems`, then `docker compose up -d --build` again.

## Sanity checks after deploy

```
docker compose ps                 # everything should be Up, postgres should be "healthy"
docker compose logs backend -n 50
curl -s https://$DOMAIN/api/problems   # should return the problem list
```

## Database

Postgres is self-hosted via the `postgres` service in docker-compose.yml
— no managed database, no separate provisioning step beyond the env vars
in `.env`.

- **Migrations run automatically.** `web/backend/db.py`'s
  `run_migrations()` fires on every backend startup (including every
  redeploy) and only applies `db/migrations/*.sql` files not already
  recorded in the `schema_migrations` table — idempotent, no manual
  migration step ever needed on deploy.
- **Inspecting the database directly**:
  ```
  docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
  ```
- **Resetting local data** (never do this in prod): `docker compose down
  -v` drops the `postgres_data` volume along with everything else.
- Postgres publishes `127.0.0.1:5432` (loopback-only, not reachable off
  the droplet) purely so `psql` works from the host — the backend itself
  always talks to it over the internal compose network via the service
  name `postgres`, never through that published port.

## Resource budget (2GB droplet)

Rough per-service memory at idle: FastAPI backend ~60-100MB, Next.js
standalone server ~80-150MB, Caddy ~20-30MB, Postgres ~40-80MB (tuned
down via `max_connections=20` in docker-compose.yml — the app's pool
never opens more than 5). The judge sandbox containers are ephemeral
(spun up per submission, torn down after, resource-limited per
`judge/run_submission.py`) so they don't add to steady-state usage.
Worth keeping an eye on `docker stats` and `free -h` under real traffic.
The droplet was resized from 1GB to 2GB specifically to make room for
Postgres — see "One-time setup" above.

## Docker-outside-of-Docker: why the paths must match exactly

The backend container talks to the *host's* Docker daemon via the
mounted socket (`/var/run/docker.sock`) to spawn each submission's judge
sandbox. That daemon resolves every `-v host_path:container_path` it's
given against its own (the host's) filesystem — it has no idea the
request came from inside another container. So `BASHCODE_PROBLEMS_PATH`
and `BASHCODE_SCRATCH_PATH` are mounted at the *same* path on both sides
on purpose: if the backend container saw the problems directory at
`/problems` while it's really at `/root/bashcode-problems` on the host,
every judge run would fail with "no such file or directory" — the host
daemon would look for `/problems` on itself and find nothing. This bit
us during local testing before the fix; worth understanding rather than
just copying the values.

## Known MVP tradeoffs, carried over from the README

- The backend container has the host's Docker socket mounted so it can
  spawn judge sandbox containers — that's root-equivalent host access if
  the backend is ever compromised. Acceptable for V1 per the README;
  revisit (separate judge service, gVisor/Firecracker) if real hostile
  traffic shows up.
- Postgres now exists (see "Database" above), but only holds auth
  schema so far (`users`, `oauth_identities`, `sessions` — prep for the
  login task). Problems are still read straight off disk, and
  submissions still aren't persisted anywhere server-side; both remain
  deliberate V1 simplifications, not related to the database existing.
