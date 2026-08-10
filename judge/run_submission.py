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


def main():
    if len(sys.argv) < 3:
        print("usage: run_submission.py <slug> <submission.sh> [problems_dir]")
        sys.exit(2)

    slug = sys.argv[1]
    submission = pathlib.Path(sys.argv[2]).resolve()
    problems_dir = pathlib.Path(
        sys.argv[3] if len(sys.argv) > 3 else "../../bashcode-problems"
    ).resolve()
    tests_dir = problems_dir / slug / "tests"

    in_files = sorted(tests_dir.glob("*.in"))
    if not in_files:
        print(f"no tests found under {tests_dir}")
        sys.exit(2)

    passed = 0
    t0 = time.time()
    for in_file in in_files:
        expected = in_file.with_suffix(".out").read_text().strip()
        actual, exit_code = run_one(submission, in_file)
        # Grade on stdout only — tools like `grep -c` legitimately exit
        # non-zero on "no match" even when their output is correct.
        # exit_code is still surfaced to tell a timeout/crash apart from
        # a plain wrong answer.
        ok = actual.strip() == expected and exit_code != "timeout"
        passed += ok
        print(f"[{'PASS' if ok else 'FAIL'}] {in_file.name}  "
              f"expected={expected!r} got={actual.strip()!r} exit={exit_code}")

    elapsed = time.time() - t0
    print(f"\n{passed}/{len(in_files)} passed in {elapsed:.2f}s total "
          f"({elapsed / len(in_files):.2f}s/test)")


if __name__ == "__main__":
    main()
