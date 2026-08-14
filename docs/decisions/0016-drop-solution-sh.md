# 0016 — Drop the separate solution.sh code block

Status: **Implemented and verified locally. Not yet deployed.**

## Context

`bashcode-problems/<slug>/solution.md` started (0009) writing prose
that deliberately pointed at `solution.sh` rather than re-embedding
its script, to avoid showing the same code twice on the page. Once
`solution.md` moved to showing multiple labeled approaches (bash loop,
`awk`, etc.) instead of one, that assumption broke in two ways: the
older single-approach problems' walkthroughs referenced a script that
was never actually rendered inline, and the newer multi-approach ones
ended up showing their "canonical" approach's code twice — once via
the reference, once via the separate `solution.sh` block the page
still rendered below the markdown. Caught by inspecting the rendered
page, not by reading the code.

## What changed

- Every `bashcode-problems/<slug>/solution.md` now embeds a complete,
  runnable code fence for **every** approach it discusses — no more
  "see solution.sh below."
- `solution.sh` is deleted from all 12 problems. It was already
  display-only (the judge only ever runs a submission against
  `tests/`, never a reference solution — confirmed in 0009), so
  nothing in the judge/grading path depended on it.
- `web/backend/main.py`'s `get_problem()` no longer reads
  `solution.sh` or returns `solution_code`.
- `web/frontend/src/lib/api.ts`'s `ProblemDetail` drops `solution_code`.
- `web/frontend/src/components/problem-solution.tsx` no longer renders
  the separate "solution.sh" label + `<pre>` block — `solution_explanation`
  (rendered markdown, code fences included) is the only thing on the
  Solution tab now.

## Verification

- `tsc --noEmit` clean after the frontend changes.
- Confirmed no other file in `bashcode-problems` still references
  `solution.sh` (`grep -rn "solution.sh" -- "*.md"` on that repo, empty).

## Explicitly out of scope

- Syntax highlighting for the embedded code fences — still the same
  plain `pre`/`code` styling as before, just with more code inside it.
