import { Footer } from "@/components/footer";

export default function TermsPage() {
  return (
    <>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-1 text-2xl font-semibold">Terms</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Plain-language notice, not a lawyer-drafted legal document — this is
          an early-stage side project. Real terms will get a proper legal
          review before there's real usage at scale.
        </p>
        <div className="flex flex-col gap-4 text-sm leading-6 text-muted-foreground">
          <p>
            BashCode is provided as-is, with no warranty of any kind. Things
            may break, change, or disappear without notice while this is being
            actively built.
          </p>
          <p>
            Every submission runs inside a disposable, locked-down Docker
            sandbox (no network access, non-root, resource-limited). Don&apos;t
            try to abuse it, attack it, or use it to do anything illegal —
            that&apos;s the one hard rule.
          </p>
          <p>
            There are no accounts yet, so there&apos;s nothing to delete or
            export. See{" "}
            <a href="/privacy" className="text-foreground underline">
              Privacy
            </a>{" "}
            for what little data exists and where it lives.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
