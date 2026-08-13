import Link from "next/link";
import { MessageSquarePlus, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationMenu } from "@/components/notification-menu";
import { ProfileMenu } from "@/components/profile-menu";
import { NavLinks } from "@/components/nav-links";

const COFFEE_URL = "https://buymeacoffee.com/bashcode";

export function NavBar() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b bg-card px-2 sm:px-4">
      <div className="flex items-center gap-2 sm:gap-6">
        <Link href="/problems" className="flex items-center gap-2">
          <Logo className="size-7" />
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">
            {/* Fixed to the logo's own green, not the (reverted) --primary
                token — this is the one piece of the color experiment that
                was a hit, kept intentionally decoupled from theme tokens. */}
            Bash<span className="text-[#4ade80]">Code</span>
          </span>
        </Link>
        <NavLinks />
      </div>
      <div className="flex items-center gap-0.5 sm:gap-1">
        <ThemeToggle />
        <NotificationMenu />
        <ProfileMenu />
        <Button
          render={<Link href="/feedback" />}
          nativeButton={false}
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Report a bug or send feedback"
        >
          <MessageSquarePlus className="size-4" />
        </Button>
        <Button
          render={<a href={COFFEE_URL} target="_blank" rel="noopener noreferrer" />}
          nativeButton={false}
          size="sm"
          variant="outline"
          className="ml-1 sm:ml-2"
          aria-label="Buy me a coffee"
        >
          <Coffee className="size-3.5" />
          <span className="hidden sm:inline">Buy me a coffee</span>
        </Button>
      </div>
    </header>
  );
}
