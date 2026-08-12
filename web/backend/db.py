import os
import pathlib
import time

import psycopg
from psycopg_pool import ConnectionPool

# This file is web/backend/db.py, so two levels up lands on the repo
# root — same root as /app inside the built image (see Dockerfile's
# `COPY db/ db/`). Unlike bashcode-problems (an external sibling repo,
# see main.py's REPO_ROOT), db/migrations lives inside this repo.
BASHCODE_REPO = pathlib.Path(__file__).resolve().parents[2]
MIGRATIONS_DIR = BASHCODE_REPO / "db" / "migrations"

# Same fallback-default pattern as BASHCODE_SCRATCH_DIR: local dev runs
# the backend directly on the host (not via docker compose), so this
# lets `docker compose up postgres -d` + `uvicorn main:app` work with
# zero manual env export.
DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://bashcode:bashcode@localhost:5432/bashcode"
)

# open=False: opened explicitly at FastAPI startup, only after
# run_migrations() has succeeded — never serve a request against a
# connection to a database that might not have the current schema yet.
pool = ConnectionPool(DATABASE_URL, min_size=1, max_size=5, open=False)

_MIGRATIONS_LOCK_KEY = "bashcode_migrations"


def _connect_with_retry(attempts: int = 10, delay_s: float = 1.0) -> psycopg.Connection:
    """Postgres may still be finishing its first-run initdb (fresh
    volume) on a cold `docker compose up`, or just not be running yet if
    a developer starts the backend before `docker compose up postgres
    -d` locally — retry briefly instead of crashing the app outright on
    a transient connection failure.
    """
    last_error: Exception | None = None
    for _ in range(attempts):
        try:
            return psycopg.connect(DATABASE_URL)
        except psycopg.OperationalError as e:
            last_error = e
            time.sleep(delay_s)
    raise RuntimeError(f"could not connect to Postgres after {attempts} attempts") from last_error


def run_migrations() -> None:
    """Applies any db/migrations/*.sql file not yet recorded in
    schema_migrations, in filename order, each in its own transaction.
    Idempotent — safe to call on every backend startup, including every
    redeploy. Guarded by a Postgres advisory lock as cheap insurance
    against two processes racing on the same migration — not currently
    reachable (uvicorn runs a single worker, no --workers flag), but
    the lock costs one line now versus a real bug later if that changes.
    """
    conn = _connect_with_retry()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT pg_advisory_lock(hashtext(%s))", (_MIGRATIONS_LOCK_KEY,))
        conn.commit()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS schema_migrations (
                      version     TEXT PRIMARY KEY,
                      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
                    )
                    """
                )
            conn.commit()

            with conn.cursor() as cur:
                cur.execute("SELECT version FROM schema_migrations")
                applied = {row[0] for row in cur.fetchall()}

            for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
                if path.name in applied:
                    continue
                with conn.cursor() as cur:
                    cur.execute(path.read_text())
                    cur.execute(
                        "INSERT INTO schema_migrations (version) VALUES (%s)", (path.name,)
                    )
                conn.commit()
        finally:
            with conn.cursor() as cur:
                cur.execute("SELECT pg_advisory_unlock(hashtext(%s))", (_MIGRATIONS_LOCK_KEY,))
            conn.commit()
    finally:
        conn.close()
