import os
import pathlib
import sys
import tempfile

import yaml
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "judge"))
from run_submission import judge  # noqa: E402

REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
DEFAULT_PROBLEMS_DIR = REPO_ROOT / "bashcode-problems"
PROBLEMS_DIR = pathlib.Path(os.environ.get("BASHCODE_PROBLEMS_DIR", DEFAULT_PROBLEMS_DIR))

app = FastAPI()

# Local dev only — the frontend runs on a different port. Reading
# problems straight off disk (no DB yet) is a deliberate V1
# simplification; swap for a Postgres-backed read once the ingest
# step exists.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SubmitRequest(BaseModel):
    slug: str
    code: str


def _load_config(slug: str) -> dict:
    config_path = PROBLEMS_DIR / slug / "config.yaml"
    if not config_path.is_file():
        raise HTTPException(status_code=404, detail=f"unknown problem: {slug}")
    return yaml.safe_load(config_path.read_text())


@app.get("/problems")
def list_problems():
    problems = []
    for config_path in sorted(PROBLEMS_DIR.glob("*/config.yaml")):
        config = yaml.safe_load(config_path.read_text())
        problems.append({
            "slug": config["slug"],
            "title": config["title"],
            "difficulty": config["difficulty"],
            "category": config["category"],
            "tags": config.get("tags", []),
        })
    return problems


@app.get("/problems/{slug}")
def get_problem(slug: str):
    config = _load_config(slug)
    problem_dir = PROBLEMS_DIR / slug
    return {
        **config,
        "description": (problem_dir / "problem.md").read_text(),
        "starter_code": (problem_dir / "starter.sh").read_text(),
    }


@app.post("/submit")
def submit(req: SubmitRequest):
    if not (PROBLEMS_DIR / req.slug / "tests").is_dir():
        raise HTTPException(status_code=404, detail=f"unknown problem: {req.slug}")

    with tempfile.NamedTemporaryFile("w", suffix=".sh", delete=False) as f:
        f.write(req.code)
        submission_path = pathlib.Path(f.name)

    try:
        return judge(req.slug, submission_path, PROBLEMS_DIR)
    finally:
        submission_path.unlink(missing_ok=True)
