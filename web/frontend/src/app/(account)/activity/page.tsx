"use client";

import { useEffect, useState } from "react";
import { listProblems, type ProblemSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ActivityList } from "@/components/activity-list";

export default function ActivityPage() {
  const { user } = useAuth();
  const [problems, setProblems] = useState<ProblemSummary[]>([]);

  useEffect(() => {
    listProblems().then(setProblems);
  }, []);

  // AccountLayout (app/(account)/layout.tsx) already guards against a
  // signed-out visitor and redirects before this ever renders.
  if (!user) return null;

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Activity</h1>
      <ActivityList problems={problems} />
    </>
  );
}
