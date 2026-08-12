import json
import os
import pathlib
import re
import shutil
import sys
import tempfile
import threading
import urllib.error
import urllib.request
from typing import Annotated

import yaml
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, StringConstraints

import account
import auth
import db
from ratelimit import check_rate_limit
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "judge"))
from run_submission import judge, run_input  # noqa: E402

REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
DEFAULT_PROBLEMS_DIR = REPO_ROOT / "bashcode-problems"
PROBLEMS_DIR = pathlib.Path(os.environ.get("BASHCODE_PROBLEMS_DIR", DEFAULT_PROBLEMS_DIR))

# The judge shells out to `docker run` against the HOST's daemon (see
# judge/run_submission.py + the docker socket mount in production). That
# daemon resolves -v source paths against its OWN filesystem, not this
# container's — so PROBLEMS_DIR and this scratch dir must be bind-mounted
# at the SAME absolute path on the host and in this container, or the
# host daemon can't find them. None locally (BASHCODE_SCRATCH_DIR unset):
# tempfile falls back to the system default, which is correct for local
# dev where this process and the Docker daemon share one real filesystem.
SCRATCH_DIR = os.environ.get("BASHCODE_SCRATCH_DIR")

app = FastAPI()

# Reading problems straight off disk (no DB yet) is a deliberate V1
# simplification; swap for a Postgres-backed read once the ingest
# step exists.
#
# CORS_ORIGINS is a comma-separated list; defaults to local dev's
# frontend origin. Production sets it to the real public domain
# (see .env.example / infra/DEPLOY.md) — without this, the browser
# blocks every client-side fetch from the deployed site.
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(account.router)


@app.on_event("startup")
def on_startup():
    # Migrations must succeed before the pool opens — never serve a
    # request against a connection to a database that might not have
    # the current schema yet.
    db.run_migrations()
    db.pool.open()


@app.on_event("shutdown")
def on_shutdown():
    db.pool.close()

# --- Abuse/exhaustion protections -------------------------------------
# The sandbox itself (network=none, cap-drop=ALL, pids/mem/cpu limits,
# disposable per-run) is a real boundary, verified end to end earlier —
# but it's not the actual near-term risk on a 1GB droplet. Nothing
# stopped concurrent submissions from collectively exceeding the box's
# total RAM, or a single client from hammering the endpoint. These three
# are deliberately simple (in-process, no Redis) — right for the current
# scale; revisit if the backend ever runs as more than one instance.

MAX_CONCURRENT_JUDGE_RUNS = int(os.environ.get("MAX_CONCURRENT_JUDGE_RUNS", "4"))
JUDGE_QUEUE_WAIT_S = 10
_judge_semaphore = threading.Semaphore(MAX_CONCURRENT_JUDGE_RUNS)

CODE_MAX_LENGTH = 20_000
INPUT_FILE_MAX_LENGTH = 200_000
INPUT_FILE_MAX_COUNT = 8

# The /feedback form. Sent via Resend (resend.com) — no SMTP, no new
# dependency (just stdlib urllib), since it's a single POST call.
# RESEND_API_KEY unset means feedback is simply unavailable rather than
# crashing the whole app — this endpoint is the only thing that needs it.
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
FEEDBACK_TO = "support@bashcode.net"
FEEDBACK_FROM = "BashCode Feedback <support@bashcode.net>"
FEEDBACK_MESSAGE_MAX_LENGTH = 5_000
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Keys double as filesystem path components written on the host (see
# _write_scratch_request) and as sandbox mount target names — the
# "<digit-prefix>-<name>" shape both encodes the intended argument order
# and, just as importantly, structurally forbids "..", ".", and "/" from
# ever appearing, so an unvalidated key can't become a path-traversal or
# arbitrary-file-write primitive.
SafeFileName = Annotated[str, StringConstraints(pattern=r"^[0-9]+-[A-Za-z0-9_.-]+$")]
FileContent = Annotated[str, Field(max_length=INPUT_FILE_MAX_LENGTH)]


class SubmitRequest(BaseModel):
    slug: str
    code: str = Field(max_length=CODE_MAX_LENGTH)


class RunRequest(BaseModel):
    slug: str
    code: str = Field(max_length=CODE_MAX_LENGTH)
    inputs: Annotated[
        dict[SafeFileName, FileContent],
        Field(min_length=1, max_length=INPUT_FILE_MAX_COUNT),
    ]


class FeedbackRequest(BaseModel):
    message: str = Field(min_length=1, max_length=FEEDBACK_MESSAGE_MAX_LENGTH)
    email: str | None = Field(default=None, max_length=320)
    # Honeypot: hidden from real users via CSS on the frontend, so only
    # bots that blindly fill every field ever populate it. Tripping it
    # silently no-ops (see submit_feedback) rather than erroring, so a
    # bot never learns to avoid the field.
    website: str = Field(default="", max_length=200)


def _run_judge(fn, *args):
    """Runs a judge invocation (fn) behind the concurrency semaphore.
    Waits up to JUDGE_QUEUE_WAIT_S for a free slot rather than queueing
    forever — past that, the box is genuinely at capacity and callers
    should back off instead of piling up.
    """
    if not _judge_semaphore.acquire(timeout=JUDGE_QUEUE_WAIT_S):
        raise HTTPException(status_code=429, detail="Judge is at capacity — try again shortly")
    try:
        return fn(*args)
    finally:
        _judge_semaphore.release()


def _send_feedback_email(message: str, reply_to: str | None) -> None:
    if not RESEND_API_KEY:
        raise HTTPException(status_code=503, detail="Feedback isn't configured yet")

    body = {"from": FEEDBACK_FROM, "to": [FEEDBACK_TO], "subject": "BashCode feedback", "text": message}
    if reply_to:
        body["reply_to"] = reply_to

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
            # Resend's API is fronted by Cloudflare, which blocks the
            # default urllib User-Agent ("Python-urllib/3.x") as a bot
            # signature — confirmed by testing directly against the API,
            # which returned Cloudflare error 1010 ("banned based on
            # your browser's signature"), not a real Resend rejection.
            "User-Agent": "BashCode-Backend/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        # 500, not 502 — Caddy's reverse_proxy doesn't cleanly forward a
        # backend-originated 502's body (observed directly: the client
        # got Caddy's own generic "error code: 502" text instead of this
        # JSON), likely because 502 has gateway-specific meaning to a
        # proxy. 500 has no such special handling.
        raise HTTPException(status_code=500, detail=f"Resend rejected the request: {detail}") from e
    except urllib.error.URLError as e:
        raise HTTPException(status_code=500, detail=f"Could not reach Resend: {e.reason}") from e


def _load_config(slug: str) -> dict:
    config_path = PROBLEMS_DIR / slug / "config.yaml"
    if not config_path.is_file():
        raise HTTPException(status_code=404, detail=f"unknown problem: {slug}")
    return yaml.safe_load(config_path.read_text())


def _write_scratch_request(code: str, inputs: dict[str, str] | None = None) -> pathlib.Path:
    """Stage one request under a fresh directory inside the DooD-safe
    scratch dir (see the module docstring above): submission.sh plus any
    named input files, each chmod'd world-readable since the sandbox
    reads these as a non-root user. Still just a path under SCRATCH_DIR,
    so the same-absolute-path DooD constraint is unaffected. Caller must
    shutil.rmtree() the returned directory when done.
    """
    scratch_dir = pathlib.Path(tempfile.mkdtemp(dir=SCRATCH_DIR))
    submission_path = scratch_dir / "submission.sh"
    submission_path.write_text(code)
    submission_path.chmod(0o644)
    for name, content in (inputs or {}).items():
        input_path = scratch_dir / name
        input_path.write_text(content)
        input_path.chmod(0o644)
    return scratch_dir


@app.get("/problems")
def list_problems():
    problems = []
    for config_path in PROBLEMS_DIR.glob("*/config.yaml"):
        config = yaml.safe_load(config_path.read_text())
        problems.append({
            "id": config["id"],
            "slug": config["slug"],
            "title": config["title"],
            "difficulty": config["difficulty"],
            "tools": config.get("tools", []),
            "topics": config.get("topics", []),
        })
    problems.sort(key=lambda p: p["id"])
    return problems


@app.get("/problems/{slug}")
def get_problem(slug: str):
    config = _load_config(slug)
    problem_dir = PROBLEMS_DIR / slug
    samples_dir = problem_dir / "tests" / "samples"
    sample_dirs = sorted(
        (p for p in samples_dir.iterdir() if p.is_dir() and p.name.isdigit()),
        key=lambda p: int(p.name),
    ) if samples_dir.is_dir() else []
    samples = [
        {
            "files": [
                {"name": f.name, "content": f.read_text()}
                for f in sorted(
                    p for p in sample_dir.iterdir()
                    if p.is_file() and p.name != "expected.out"
                )
            ],
            "expected": (sample_dir / "expected.out").read_text().strip(),
        }
        for sample_dir in sample_dirs
    ]
    return {
        **config,
        "description": (problem_dir / "problem.md").read_text(),
        "starter_code": (problem_dir / "starter.sh").read_text(),
        "samples": samples,
    }


@app.post("/submit")
def submit(req: SubmitRequest, request: Request):
    check_rate_limit(request)
    if not (PROBLEMS_DIR / req.slug / "tests").is_dir():
        raise HTTPException(status_code=404, detail=f"unknown problem: {req.slug}")

    scratch_dir = _write_scratch_request(req.code)
    try:
        return _run_judge(judge, req.slug, scratch_dir / "submission.sh", PROBLEMS_DIR)
    finally:
        shutil.rmtree(scratch_dir, ignore_errors=True)


@app.post("/run")
def run(req: RunRequest, request: Request):
    check_rate_limit(request)
    if not (PROBLEMS_DIR / req.slug).is_dir():
        raise HTTPException(status_code=404, detail=f"unknown problem: {req.slug}")

    scratch_dir = _write_scratch_request(req.code, req.inputs)
    try:
        files = sorted((name, scratch_dir / name) for name in req.inputs)
        return _run_judge(run_input, scratch_dir / "submission.sh", files)
    finally:
        shutil.rmtree(scratch_dir, ignore_errors=True)


@app.post("/feedback")
def submit_feedback(req: FeedbackRequest, request: Request):
    check_rate_limit(request)

    # Honeypot tripped — report success without sending, so a bot never
    # learns this field is being checked.
    if req.website:
        return {"sent": True}

    email = req.email.strip() if req.email else None
    if email and not EMAIL_PATTERN.match(email):
        raise HTTPException(status_code=422, detail="That doesn't look like a valid email")

    _send_feedback_email(req.message.strip(), email)
    return {"sent": True}
