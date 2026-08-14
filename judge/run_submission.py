#!/usr/bin/env python3
"""Run one bash submission against one problem's tests in a disposable,
locked-down Docker sandbox. Prototype only — validates the judge design
end to end before any web/backend plumbing exists.
"""
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import time

IMAGE = "bashcode-sandbox:latest"
TIME_LIMIT_S = 5
MEM_LIMIT = "64m"
PIDS_LIMIT = "64"

# Same env var and same reasoning as web/backend/main.py's SCRATCH_DIR:
# the judge shells out to `docker run` against the HOST's daemon, which
# resolves -v source paths against its own filesystem, not this
# process's — so a materialized filesystem-test tree (see run_one)
# must live under a path that's bind-mounted identically on both sides.
# None locally (unset) is correct: tempfile then falls back to the
# system default, fine where this process and the Docker daemon share
# one real filesystem.
SCRATCH_DIR = os.environ.get("BASHCODE_SCRATCH_DIR")

# A reserved filename, same idea as expected.out: if a test dir has one,
# it's hand-written prose (rendered as markdown), shown to the user in
# PLACE OF the real input files whenever present. `files` (the real
# input, needed by e.g. the "Run" button, which echoes it straight
# back to /run) is never touched by this — description.md is a purely
# additive, parallel field the frontend prefers when rendering. Exists
# because the real input isn't always fit to display raw: a filesystem
# test's "1-setup.sh" is a script, not data, and dumping its source
# just leaks the mechanism rather than describing the test case. Not
# filesystem-specific — any test case can add one if its raw input
# needs better framing.
DESCRIPTION_FILENAME = "description.md"


def _description(test_dir):
    description = test_dir / DESCRIPTION_FILENAME
    return description.read_text() if description.is_file() else None


def run_one(submission_path, files):
    """files: ordered list of (name, host_path) tuples. Each is mounted
    individually into /sandbox/input/<name>:ro and passed as a positional
    arg in the same order — never a directory bind-mount of the source
    test folder, since that folder sits right next to expected.out and
    a directory mount would hand the submission a way to just cat it.

    One exception: a single ("1-setup.sh", path) entry means this is a
    filesystem test (find/permissions/timestamps problems), not a flat
    data file — "1-setup.sh" so it's still a normal, valid input filename
    under the same "<digit>-<name>" convention every other test file
    already uses (see SafeFileName in web/backend/main.py), not a special
    case that needs its own validation exception. 1-setup.sh is trusted
    content (authored in bashcode-problems, never submitted by a user) —
    it's executed directly on the host, given a fresh empty directory to
    populate however it likes (mkdir, touch -d for specific mtimes,
    chmod, ...), and *that* directory is what actually gets mounted, as
    a single /sandbox/input/tree, instead of the script's own source text.
    """
    tree_dir = None
    if len(files) == 1 and files[0][0] == "1-setup.sh":
        tree_dir = pathlib.Path(tempfile.mkdtemp(prefix="bashcode-tree-", dir=SCRATCH_DIR))
        subprocess.run(["bash", str(files[0][1]), str(tree_dir)], check=True)
        # The sandbox always runs as a fixed low-priv user (65534), which
        # won't generally match whatever uid just created this tree — so
        # without this, the submission couldn't even list the directory.
        # Only directories get it, and only +rx ("list" + "traverse"):
        # find's common predicates (-name/-mtime/-perm/-type) only ever
        # stat a file, which needs the containing directory to be
        # readable/searchable, never the file itself — so a setup.sh
        # testing e.g. `find -perm 600` on a file keeps that exact mode.
        subprocess.run(
            ["find", str(tree_dir), "-type", "d", "-exec", "chmod", "o+rx", "{}", "+"],
            check=True,
        )
        mount_files = [("tree", tree_dir)]
    else:
        mount_files = files

    try:
        mount_args, positional_args = [], []
        for name, host_path in mount_files:
            target = f"/sandbox/input/{name}"
            mount_args += ["-v", f"{host_path}:{target}:ro"]
            positional_args.append(target)

        cid = subprocess.run(
            [
                "docker", "run", "-d",
                "--network=none",
                "--user", "65534:65534",
                "--cap-drop=ALL",
                "--security-opt", "no-new-privileges",
                "--pids-limit", PIDS_LIMIT,
                "--memory", MEM_LIMIT, "--memory-swap", MEM_LIMIT,
                "--cpus", "0.5",
                "--read-only",
                "--tmpfs", "/tmp:rw,size=16m,mode=1777",
                "-v", f"{submission_path}:/sandbox/submission.sh:ro",
                *mount_args,
                IMAGE,
                "bash", "/sandbox/submission.sh", *positional_args,
            ],
            capture_output=True, text=True, check=True,
        ).stdout.strip()

        deadline = time.time() + TIME_LIMIT_S
        timed_out = True
        while time.time() < deadline:
            state = subprocess.run(
                ["docker", "inspect", "-f", "{{.State.Running}}", cid],
                capture_output=True, text=True,
            ).stdout.strip()
            if state == "false":
                timed_out = False
                break
            time.sleep(0.02)
        if timed_out:
            subprocess.run(["docker", "kill", cid], capture_output=True)

        logs = subprocess.run(["docker", "logs", cid], capture_output=True, text=True).stdout
        exit_code = subprocess.run(
            ["docker", "inspect", "-f", "{{.State.ExitCode}}", cid],
            capture_output=True, text=True,
        ).stdout.strip()
        subprocess.run(["docker", "rm", "-f", cid], capture_output=True)

        return logs, ("timeout" if timed_out else exit_code)
    finally:
        if tree_dir is not None:
            shutil.rmtree(tree_dir, ignore_errors=True)


def judge(slug, submission_path, problems_dir):
    """Run a submission against every test case for `slug`. Returns a dict
    with a per-test breakdown and an overall verdict, used by both the CLI
    and the /submit API route.
    """
    submission_path = pathlib.Path(submission_path).resolve()
    problems_dir = pathlib.Path(problems_dir).resolve()
    tests_dir = problems_dir / slug / "tests"

    if not tests_dir.is_dir():
        return {"slug": slug, "verdict": "No Tests Found", "tests": [], "elapsed_seconds": 0}

    # Each test case is a directory of digit-only name (tests/1/, tests/2/,
    # ...) containing its input files plus expected.out. Sort numerically,
    # not lexically, so tests/10 doesn't land before tests/2.
    test_dirs = sorted(
        (p for p in tests_dir.iterdir() if p.is_dir() and p.name.isdigit()),
        key=lambda p: int(p.name),
    )
    if not test_dirs:
        return {"slug": slug, "verdict": "No Tests Found", "tests": [], "elapsed_seconds": 0}

    tests = []
    t0 = time.time()
    for test_dir in test_dirs:
        expected = (test_dir / "expected.out").read_text().strip()
        files = sorted(
            (p.name, p) for p in test_dir.iterdir()
            if p.is_file() and p.name not in ("expected.out", DESCRIPTION_FILENAME)
        )
        actual, exit_code = run_one(submission_path, files)
        actual = actual.strip()
        # Grade on stdout only — tools like `grep -c` legitimately exit
        # non-zero on "no match" even when their output is correct.
        # exit_code is still surfaced to tell a timeout apart from a
        # plain wrong answer.
        passed = actual == expected and exit_code != "timeout"
        tests.append({
            "name": test_dir.name,
            "expected": expected,
            "actual": actual,
            "files": [{"name": name, "content": path.read_text()} for name, path in files],
            "description": _description(test_dir),
            "exit_code": exit_code,
            "passed": passed,
        })

    if any(t["exit_code"] == "timeout" for t in tests):
        verdict = "Timeout"
    elif all(t["passed"] for t in tests):
        verdict = "Accepted"
    else:
        verdict = "Wrong Answer"

    return {
        "slug": slug,
        "verdict": verdict,
        "tests": tests,
        "elapsed_seconds": round(time.time() - t0, 2),
    }


def run_input(submission_path, files):
    """Run a submission against ad-hoc input files and return the raw
    output — no expected value, no pass/fail. Used by /run (the "Run"
    button), which is deliberately never a grading pass, even when the
    input happens to match a known sample: there's nothing here to
    compare against for genuinely custom input, so this never tries to.

    files: ordered list of (name, path) tuples, same shape as run_one.
    """
    submission_path = pathlib.Path(submission_path).resolve()
    files = [(name, pathlib.Path(p).resolve()) for name, p in files]
    output, exit_code = run_one(submission_path, files)
    return {"output": output.strip(), "exit_code": exit_code}


def main():
    if len(sys.argv) < 3:
        print("usage: run_submission.py <slug> <submission.sh> [problems_dir]")
        sys.exit(2)

    slug = sys.argv[1]
    submission = sys.argv[2]
    problems_dir = sys.argv[3] if len(sys.argv) > 3 else "../../bashcode-problems"

    result = judge(slug, submission, problems_dir)
    if result["verdict"] == "No Tests Found":
        print(f"no tests found for {slug}")
        sys.exit(2)

    for t in result["tests"]:
        status = "PASS" if t["passed"] else "FAIL"
        print(f"[{status}] {t['name']}  expected={t['expected']!r} "
              f"got={t['actual']!r} exit={t['exit_code']}")

    n_passed = sum(t["passed"] for t in result["tests"])
    n_total = len(result["tests"])
    print(f"\n{n_passed}/{n_total} passed in {result['elapsed_seconds']:.2f}s total "
          f"({result['elapsed_seconds'] / n_total:.2f}s/test) — {result['verdict']}")


if __name__ == "__main__":
    main()
