# 0009 — Problem solutions (always visible, script + written walkthrough)

Status: **Implemented and verified locally. Not yet deployed.**

## Context

The problem page already had a "Solution" tab, but its own placeholder
comment flagged two open questions: when should it become visible, and
what should it contain? `solution.sh` already existed for all 9
problems (used internally by the judge/test-authoring process) but was
never exposed via any API — confirmed via grep, zero references to
"solution" in `main.py` before this change.

Confirmed via AskUserQuestion:
- **Always visible** — no gating on solving/attempting first.
- **Script + written walkthrough** — not just the raw script. This
  meant real content-authoring work: a `solution.md` per problem,
  drafted from each problem's actual `problem.md` and `solution.sh`.

## Design decisions worth knowing (why, not just what)

- **One new file per problem, `solution.md`**, sibling to the existing
  `problem.md`/`starter.sh`/`solution.sh`/`config.yaml` in
  `bashcode-problems/<slug>/` — matches that repo's existing
  per-problem file convention, no new structure invented.
- **No new endpoint** — `GET /problems/{slug}` already returns the
  full problem payload; solution content is just two more fields on
  that same response (`solution_code`, `solution_explanation`), since
  "always visible" means there's no access-control reason to gate it
  behind a separate call.
- **The walkthrough doesn't re-embed the full script.** The first
  draft of each `solution.md` included a fenced ```bash block with the
  complete script inline, in addition to the dedicated `solution_code`
  block the page already renders separately — verified visually (via
  a real browser screenshot) that this showed the same script twice on
  the page. Fixed by removing the inline block from every walkthrough,
  keeping the prose analysis (which already references individual
  expressions via inline code spans) and pointing to `solution.sh`
  below for the full text. Worth flagging because it's the kind of
  redundancy that's easy to miss without actually rendering the page.
- **`solution_code` renders as a plain styled `<pre>` block**, not
  round-tripped through `react-markdown` — it's a raw string, not
  markdown, so wrapping it in a fake ```bash fence just to reuse
  `ReactMarkdown` would be unnecessary indirection. Reuses the same
  `pre`/`code` Tailwind classes already established in
  `problem-description.tsx`.
- **`solution_explanation` is real markdown**, rendered via
  `ReactMarkdown` exactly like `ProblemDescription` and the legal
  pages already do.

## What shipped

- `bashcode-problems/<slug>/solution.md` — 9 new files, one per
  existing problem.
- `web/backend/main.py` — `get_problem()` now also reads `solution.sh`
  and `solution.md` and returns them as `solution_code`/
  `solution_explanation`.
- `web/frontend/src/lib/api.ts` — `ProblemDetail` gains both fields.
- `web/frontend/src/components/problem-solution.tsx` (new).
- `web/frontend/src/components/problem-page-layout.tsx` — the
  Solution tab's placeholder replaced with `<ProblemSolution>` in both
  the desktop split-pane and mobile stacked layouts.

## Verification

- `curl`'d all 9 problems' `/problems/{slug}` locally — confirmed
  non-empty, correct `solution_code` and `solution_explanation` for
  every one, not just a single spot-check.
- Real browser pass on both the desktop (split-pane) and mobile
  (stacked) layouts — zero page errors, confirmed the walkthrough
  renders as formatted markdown and the script renders as a readable
  code block.
- Caught and fixed the script-shown-twice issue above via the same
  screenshots, not just by reading the code.
- Deploy needs `git pull` in *both* `bashcode` and `bashcode-problems`
  on the droplet (per `infra/DEPLOY.md`'s existing two-repo pull step)
  before rebuilding — this is the first deploy in this decision-doc
  series that actually needs a `bashcode-problems` change.

## Explicitly out of scope
- Any gating/reveal logic — confirmed always visible.
- Discussion tab / discussions system — separate, larger piece, planned next.
