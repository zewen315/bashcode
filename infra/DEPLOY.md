# Deploying to the droplet

## One-time setup

1. **DNS**: point `DOMAIN`'s A record at the droplet's IP *before* starting
   Caddy — it requests a Let's Encrypt cert on first boot and the HTTP-01
   challenge will fail if DNS isn't live yet.
2. **Docker**: install Docker Engine + the Compose plugin on the droplet
   (`curl -fsSL https://get.docker.com | sh`; the compose plugin ships
   with it on recent installs — `docker compose version` to confirm).
3. **Firewall**: open 80 and 443 (`ufw allow 80,443/tcp` if using ufw).
4. **Clone both repos under `/root`**, matching `.env.example`'s defaults
   (the exact path matters — see the Docker-outside-of-Docker note below):
   ```
   cd /root
   git clone https://github.com/zewen315/bashcode.git
   git clone https://github.com/zewen315/bashcode-problems.git   # needs a deploy key/PAT — private repo
   mkdir -p /root/bashcode-scratch
   ```
5. **Configure env**: `cp bashcode/.env.example bashcode/.env` and fill in
   real values (see comments in that file). If you clone anywhere other
   than `/root`, update `BASHCODE_PROBLEMS_PATH` and `BASHCODE_SCRATCH_PATH`
   to match — they must be the actual absolute path on the host.

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
docker compose ps                 # everything should be Up
docker compose logs backend -n 50
curl -s https://$DOMAIN/api/problems   # should return the problem list
```

## Resource budget (1GB droplet)

Rough per-service memory at idle: FastAPI backend ~60-100MB, Next.js
standalone server ~80-150MB, Caddy ~20-30MB. The judge sandbox
containers are ephemeral (spun up per submission, torn down after,
resource-limited per `judge/run_submission.py`) so they don't add to
steady-state usage. Worth keeping an eye on `docker stats` and `free -h`
under real traffic — this is the first time anything's actually running
concurrently with the OS on this box since the previous project was
cleared off it.

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
- No Postgres/queue yet — problems are still read straight off disk, and
  submissions aren't persisted anywhere server-side.
