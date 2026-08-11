export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-1 text-2xl font-semibold">Privacy</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Plain-language notice, not a lawyer-drafted legal document — this is
        an early-stage side project. Real terms will get a proper legal
        review before there's real usage at scale.
      </p>
      <div className="flex flex-col gap-4 text-sm leading-6 text-muted-foreground">
        <p>
          There are no accounts, so there&apos;s no server-side profile or
          tracking. A few preferences — starred problems, solved status,
          light/dark theme, the &quot;demo sign-in&quot; preview — are stored
          only in your browser&apos;s local storage. They never leave your
          device and aren&apos;t visible to anyone else.
        </p>
        <p>
          When you click Submit, the bash script you wrote is sent to the
          server, run once inside a disposable sandbox to grade it, and the
          result is returned to you. The code itself isn&apos;t stored
          afterward.
        </p>
        <p>
          The feedback icon in the nav bar opens a plain{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-foreground">mailto:</code>{" "}
          link — anything you send goes directly to the site owner&apos;s
          personal email, not through this server.
        </p>
        <p>No cookies, no analytics, no third-party trackers, no ads.</p>
      </div>
    </main>
  );
}
