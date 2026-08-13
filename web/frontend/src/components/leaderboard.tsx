"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchLeaderboard, type LeaderboardData } from "@/lib/progress-api";

export function Leaderboard() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      if (!user) return null;
      return fetchLeaderboard();
    }

    load().then((result) => {
      if (cancelled) return;
      setData(result);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">Sign in to see your ranking.</p>
    );
  }

  if (!loaded) return null;

  if (!data || data.total_users <= 1 || data.percentile === null) {
    return (
      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <Trophy className="size-6 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Come back once more people join to see how you rank.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-foreground">
          Rank #{data.rank} of {data.total_users}
        </span>
        <span className="text-xs text-muted-foreground">{data.solved} solved</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${data.percentile}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Ahead of {data.percentile}% of solvers
      </p>
    </div>
  );
}
