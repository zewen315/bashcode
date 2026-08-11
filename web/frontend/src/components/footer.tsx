import Link from "next/link";

const FEEDBACK_MAILTO = "mailto:zewen315@gmail.com?subject=BashCode%20feedback";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-6 py-10 text-sm sm:grid-cols-4">
        <div className="flex flex-col gap-2">
          <p className="font-semibold">Links</p>
          <Link href="/problems" className="text-muted-foreground hover:text-foreground">
            Problems
          </Link>
          <Link href="/discussions" className="text-muted-foreground hover:text-foreground">
            Discussions
          </Link>
          <Link href="/about" className="text-muted-foreground hover:text-foreground">
            About
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-semibold">Socials</p>
          <span className="text-muted-foreground">Coming soon</span>
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-semibold">Contact</p>
          <a href={FEEDBACK_MAILTO} className="text-muted-foreground hover:text-foreground">
            Feedback
          </a>
          <Link href="/donate" className="text-muted-foreground hover:text-foreground">
            Buy me a coffee
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-semibold">Legal</p>
          <Link href="/terms" className="text-muted-foreground hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
            Privacy
          </Link>
        </div>
      </div>
      <div className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
        © {year} BashCode. All rights reserved.
      </div>
    </footer>
  );
}
