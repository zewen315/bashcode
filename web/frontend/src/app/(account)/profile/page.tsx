"use client";

import { useEffect, useState } from "react";
import { listProblems, type ProblemSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Widget } from "@/components/widget";
import { StatusChart } from "@/components/status-chart";
import { MiniCalendar } from "@/components/mini-calendar";
import { Leaderboard } from "@/components/leaderboard";

export default function ProfilePage() {
  const { user } = useAuth();
  const [problems, setProblems] = useState<ProblemSummary[]>([]);

  useEffect(() => {
    listProblems().then(setProblems);
  }, []);

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

      <dl className="mb-6 flex flex-col gap-3 text-sm">
        <div className="flex justify-between border-b pb-3">
          <dt className="text-muted-foreground">Joined</dt>
          <dd>{joined}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-4">
        <Widget title="Your Status">
          <StatusChart problems={problems} />
        </Widget>
        <Widget>
          <MiniCalendar today={new Date()} />
        </Widget>
        <Widget title="Leaderboard">
          <Leaderboard />
        </Widget>
      </div>
    </>
  );
}
