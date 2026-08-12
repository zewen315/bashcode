import os
import pathlib
import sys
import tempfile

import yaml
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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


class SubmitRequest(BaseModel):
    slug: str
    code: str


class RunRequest(BaseModel):
    slug: str
    code: str
    input: str


def _load_config(slug: str) -> dict:
    config_path = PROBLEMS_DIR / slug / "config.yaml"
    if not config_path.is_file():
        raise HTTPException(status_code=404, detail=f"unknown problem: {slug}")
    return yaml.safe_load(config_path.read_text())


def _write_scratch_file(content: str, suffix: str) -> pathlib.Path:
    """Write to the DooD-safe scratch dir (see the module docstring above)
    and chmod world-readable, since the sandbox container reads this as a
    non-root user. Shared by /submit and /run — both hand the judge a
    script; /run also uses it for the ad-hoc input file.
    """
    with tempfile.NamedTemporaryFile("w", suffix=suffix, delete=False, dir=SCRATCH_DIR) as f:
        f.write(content)
        path = pathlib.Path(f.name)
    path.chmod(0o644)
    return path


@app.get("/problems")
def list_problems():
    problems = []
    for config_path in sorted(PROBLEMS_DIR.glob("*/config.yaml")):
        config = yaml.safe_load(config_path.read_text())
        problems.append({
            "slug": config["slug"],
            "title": config["title"],
            "difficulty": config["difficulty"],
            "tools": config.get("tools", []),
            "topics": config.get("topics", []),
        })
    return problems


@app.get("/problems/{slug}")
def get_problem(slug: str):
    config = _load_config(slug)
    problem_dir = PROBLEMS_DIR / slug
    samples_dir = problem_dir / "tests" / "samples"
    samples = [
        {
            "input": in_file.read_text(),
            "expected": in_file.with_suffix(".out").read_text().strip(),
        }
        for in_file in sorted(samples_dir.glob("*.in"))
    ]
    return {
        **config,
        "description": (problem_dir / "problem.md").read_text(),
        "starter_code": (problem_dir / "starter.sh").read_text(),
        "samples": samples,
    }


@app.post("/submit")
def submit(req: SubmitRequest):
    if not (PROBLEMS_DIR / req.slug / "tests").is_dir():
        raise HTTPException(status_code=404, detail=f"unknown problem: {req.slug}")

    submission_path = _write_scratch_file(req.code, ".sh")
    try:
        return judge(req.slug, submission_path, PROBLEMS_DIR)
    finally:
        submission_path.unlink(missing_ok=True)


@app.post("/run")
def run(req: RunRequest):
    if not (PROBLEMS_DIR / req.slug).is_dir():
        raise HTTPException(status_code=404, detail=f"unknown problem: {req.slug}")

    submission_path = _write_scratch_file(req.code, ".sh")
    input_path = _write_scratch_file(req.input, ".txt")
    try:
        return run_input(submission_path, input_path)
    finally:
        submission_path.unlink(missing_ok=True)
        input_path.unlink(missing_ok=True)
