import Link from "next/link";
import { TerminalSquare } from "lucide-react";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="mb-10 flex flex-col items-center gap-3 border-b pb-10 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <TerminalSquare className="size-5" />
          </div>
          <h1 className="text-2xl font-semibold">About BashCode</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            A hands-on practice platform for Bash scripting — real shell
            problems, judged on what your script actually does.
          </p>
        </div>

        <div className="flex flex-col gap-6 text-sm leading-6 text-muted-foreground">
          <p>
            Problems are multi-step and practical — log analysis, file batch
            operations, config processing — not single-command drills. New
            problems are shipping regularly, with harder ones on the way.
          </p>
          <p>
            Every submission runs in a disposable, locked-down Docker sandbox
            and is judged on its actual output and behavior, never on which
            commands you used. If your script produces the right result, it
            passes — whether you reached for{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-foreground">grep</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-foreground">awk</code>, or
            something else entirely.
          </p>
          <p>
            It&apos;s built for SRE, DevOps, platform, and backend/Linux
            engineers — including anyone interview-prepping for a role that
            expects real shell fluency.
          </p>
          <p>
            You can solve problems without an account. Sign in with Google or
            GitHub if you want your progress, submissions, and ranking saved
            across sessions — it&apos;s free, and there&apos;s nothing to pay
            for yet.
          </p>
          <p>
            BashCode is an early-stage, self-funded side project, built and
            maintained by one person. Bug reports and feature requests
            genuinely shape what gets built next — the{" "}
            <Link href="/feedback" className="text-foreground underline underline-offset-2">
              feedback page
            </Link>{" "}
            goes straight to me.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 border-t pt-8">
          <Button render={<Link href="/problems" />} nativeButton={false}>
            Try a problem
          </Button>
          <Button
            variant="outline"
            render={<Link href="/discussions" />}
            nativeButton={false}
          >
            See discussions
          </Button>
          <Button
            variant="outline"
            render={
              <a href="https://x.com/bashcodenet" target="_blank" rel="noopener noreferrer" />
            }
            nativeButton={false}
          >
            Follow on X
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
