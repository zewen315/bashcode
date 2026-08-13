"use client";

import { useAuth } from "@/lib/auth-context";

export default function ProfilePage() {
  const { user } = useAuth();

  // AccountLayout (app/(account)/layout.tsx) already guards against a
  // signed-out visitor and redirects before this ever renders.
  if (!user) return null;

  const joined = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Profile</h1>

      <dl className="flex flex-col gap-3 text-sm">
        <div className="flex justify-between border-b pb-3">
          <dt className="text-muted-foreground">Joined</dt>
          <dd>{joined}</dd>
        </div>
      </dl>

      {/* Solved/starred/activity dashboard and heat map land here once
          that data lives in Postgres instead of localStorage — see
          docs/decisions/0006-dropdown-redesign-and-profile-stub.md. */}
      <p className="mt-6 text-sm text-muted-foreground">
        Solved-problem stats and an activity heat map are coming here soon.
      </p>
    </>
  );
}
