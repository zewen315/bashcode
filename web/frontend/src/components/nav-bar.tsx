import Link from "next/link";
import { ListChecks, MessagesSquare, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationMenu } from "@/components/notification-menu";
import { ProfileMenu } from "@/components/profile-menu";

const NAV_LINKS = [
  { label: "Problems", href: "/problems", icon: ListChecks },
  { label: "Discussions", href: "/discussions", icon: MessagesSquare },
  { label: "About", href: "/about", icon: Info },
];

export function NavBar() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b bg-card px-4">
      <div className="flex items-center gap-6">
        <Link href="/problems" className="flex items-center gap-2">
          <Logo className="size-7" />
          <span className="text-sm font-semibold tracking-tight">
            Bash<span className="text-primary">Code</span>
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          {NAV_LINKS.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-1.5 hover:text-foreground">
              <Icon className="size-3.5" />
              {label}
            </Link>
          ))}
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
