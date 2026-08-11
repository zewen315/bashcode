export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-4 text-2xl font-semibold">About BashCode</h1>
      <div className="flex flex-col gap-4 text-sm leading-6 text-muted-foreground">
        <p>
          BashCode is a LeetCode-style practice platform for Bash scripting.
          Problems are multi-step and practical — log analysis, file
          batch operations, config processing — not single-command drills.
        </p>
        <p>
          Every submission runs in a disposable, locked-down Docker sandbox
          and is judged on its actual output and behavior, never on which
          commands you used. If your script produces the right result, it
          passes — whether you reached for <code className="rounded bg-muted px-1 py-0.5 text-foreground">grep</code>,{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-foreground">awk</code>, or something else entirely.
        </p>
        <p>
          It&apos;s built for SRE, DevOps, platform, and backend/Linux
          engineers — including anyone interview-prepping for a role that
          expects real shell fluency.
        </p>
        <p>
          BashCode is an early-stage, self-funded side project. No accounts,
          no payments yet — just problems and a judge that actually runs
          your code.
        </p>
      </div>
    </main>
  );
}
