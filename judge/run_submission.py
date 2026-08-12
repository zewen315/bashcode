#!/usr/bin/env python3
"""Run one bash submission against one problem's tests in a disposable,
locked-down Docker sandbox. Prototype only — validates the judge design
end to end before any web/backend plumbing exists.
"""
import pathlib
import subprocess
import sys
import time

IMAGE = "bashcode-sandbox:latest"
TIME_LIMIT_S = 5
MEM_LIMIT = "64m"
PIDS_LIMIT = "64"


def run_one(submission_path, input_path):
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
            "-v", f"{input_path}:/sandbox/input.txt:ro",
            IMAGE,
            "bash", "/sandbox/submission.sh", "/sandbox/input.txt",
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


def judge(slug, submission_path, problems_dir):
    """Run a submission against every test case for `slug`. Returns a dict
    with a per-test breakdown and an overall verdict, used by both the CLI
    and the /submit API route.
    """
    submission_path = pathlib.Path(submission_path).resolve()
    problems_dir = pathlib.Path(problems_dir).resolve()
    tests_dir = problems_dir / slug / "tests"

    in_files = sorted(tests_dir.glob("*.in"))
    if not in_files:
        return {"slug": slug, "verdict": "No Tests Found", "tests": [], "elapsed_seconds": 0}

    tests = []
    t0 = time.time()
    for in_file in in_files:
        expected = in_file.with_suffix(".out").read_text().strip()
        actual, exit_code = run_one(submission_path, in_file)
        actual = actual.strip()
        # Grade on stdout only — tools like `grep -c` legitimately exit
        # non-zero on "no match" even when their output is correct.
        # exit_code is still surfaced to tell a timeout apart from a
        # plain wrong answer.
        passed = actual == expected and exit_code != "timeout"
        tests.append({
            "name": in_file.name,
            "expected": expected,
            "actual": actual,
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


def run_input(submission_path, input_path):
    """Run a submission against one ad-hoc input and return the raw output —
    no expected value, no pass/fail. Used by /run (the "Run" button), which
    is deliberately never a grading pass, even when the input happens to be
    a known sample: there's nothing here to compare against for genuinely
    custom input, so this never tries to.
    """
    submission_path = pathlib.Path(submission_path).resolve()
    input_path = pathlib.Path(input_path).resolve()
    output, exit_code = run_one(submission_path, input_path)
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
