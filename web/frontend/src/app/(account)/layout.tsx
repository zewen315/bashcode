"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { User, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Footer } from "@/components/footer";
import { useAuth } from "@/lib/auth-context";
import { initials, providerLabel } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/problems");
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-16 sm:flex-row">
        <aside className="flex shrink-0 flex-col gap-6 sm:w-56">
          <div className="flex flex-col items-center gap-2 text-center">
            <Avatar size="lg">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {initials(user.display_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{user.display_name ?? "you"}</div>
              <div className="text-xs text-muted-foreground">@{user.public_id}</div>
              <div className="text-xs text-muted-foreground">Signed in with {providerLabel(user.provider)}</div>
            </div>
          </div>
          <nav className="flex flex-row gap-1 sm:flex-col">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm",
                  pathname === href
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </main>
      <Footer />
    </>
  );
}
