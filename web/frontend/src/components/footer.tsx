import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="flex h-8 shrink-0 items-center justify-center gap-4 border-t bg-card px-4 text-xs text-muted-foreground">
      <span>© {year} BashCode</span>
      <Link href="/terms" className="hover:text-foreground">
        Terms
      </Link>
      <Link href="/privacy" className="hover:text-foreground">
        Privacy
      </Link>
    </footer>
  );
}
