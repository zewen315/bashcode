import Link from "next/link";

const SUPPORT_MAILTO = "mailto:support@bashcode.net";
const TWITTER_URL = "https://x.com/bashcodenet";
const COFFEE_URL = "https://buymeacoffee.com/bashcode";

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
          <a
            href={TWITTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            X (Twitter)
          </a>
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-semibold">Contact</p>
          <Link href="/feedback" className="text-muted-foreground hover:text-foreground">
            Feedback
          </Link>
          <a href={SUPPORT_MAILTO} className="text-muted-foreground hover:text-foreground">
            support@bashcode.net
          </a>
          <a
            href={COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            Buy me a coffee
          </a>
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
