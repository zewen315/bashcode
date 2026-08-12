"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Footer } from "@/components/footer";
import { initials, providerLabel } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/problems");
  }, [loading, user, router]);

  if (loading || !user) return null;

  const joined = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
              {initials(user.display_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold">{user.display_name ?? "you"}</h1>
            <span className="text-sm text-muted-foreground">#{user.public_id}</span>
          </div>
        </div>

        <dl className="mt-8 flex flex-col gap-3 text-sm">
          <div className="flex justify-between border-b pb-3">
            <dt className="text-muted-foreground">Signed in with</dt>
            <dd>{providerLabel(user.provider)}</dd>
          </div>
          <div className="flex justify-between border-b pb-3">
            <dt className="text-muted-foreground">Joined</dt>
            <dd>{joined}</dd>
          </div>
        </dl>

        {/* Solved/starred/activity dashboard and heat map land here once
            that data lives in Postgres instead of localStorage — see
            docs/decisions/0006-dropdown-redesign-and-profile-stub.md. */}
      </main>
      <Footer />
    </>
  );
}
