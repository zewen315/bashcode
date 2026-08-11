import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationMenu } from "@/components/notification-menu";
import { ProfileMenu } from "@/components/profile-menu";

export function NavBar() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b bg-card px-4">
      <div className="flex items-center gap-6">
        <Link href="/problems" className="text-sm font-semibold tracking-tight">
          Bash<span className="text-primary">Code</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/problems" className="hover:text-foreground">
            Problems
          </Link>
          <Link href="/discussions" className="hover:text-foreground">
            Discussions
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationMenu />
        <ProfileMenu />
        <Button
          render={<Link href="/donate" />}
          nativeButton={false}
          size="sm"
          variant="outline"
          className="ml-2"
        >
          Donate
        </Button>
      </div>
    </header>
  );
}
