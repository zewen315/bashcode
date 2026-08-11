import Link from "next/link";

export function NavBar() {
  return (
    <header className="flex h-12 shrink-0 items-center border-b bg-card px-4">
      <Link href="/problems" className="text-sm font-semibold tracking-tight">
        Bash<span className="text-primary">Code</span>
      </Link>
      <nav className="ml-6 flex items-center gap-4 text-sm text-muted-foreground">
        <Link href="/problems" className="hover:text-foreground">
          Problems
        </Link>
      </nav>
    </header>
  );
}
