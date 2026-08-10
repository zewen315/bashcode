import os
import pathlib
import sys
import tempfile

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "judge"))
from run_submission import judge  # noqa: E402

REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
DEFAULT_PROBLEMS_DIR = REPO_ROOT / "bashcode-problems"
PROBLEMS_DIR = pathlib.Path(os.environ.get("BASHCODE_PROBLEMS_DIR", DEFAULT_PROBLEMS_DIR))

app = FastAPI()


class SubmitRequest(BaseModel):
    slug: str
    code: str


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
