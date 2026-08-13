import type { ActivityEntry } from "@/lib/local-progress";

export type ProgressData = {
  solved: string[];
  starred: string[];
  attempted: string[];
  activity: ActivityEntry[];
  active_dates: string[];
  finished_last_3_days: number;
  finished_last_7_days: number;
};

export type LeaderboardData = {
  rank: number;
  total_users: number;
  solved: number;
  percentile: number | null;
};

export async function fetchProgress(): Promise<ProgressData | null> {
  const res = await fetch("/api/progress", { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchLeaderboard(): Promise<LeaderboardData | null> {
  const res = await fetch("/api/progress/leaderboard", { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function starProblem(slug: string): Promise<void> {
  await fetch(`/api/progress/star/${slug}`, { method: "POST" });
}

export async function unstarProblem(slug: string): Promise<void> {
  await fetch(`/api/progress/star/${slug}`, { method: "DELETE" });
}

export async function resetSubmissions(): Promise<void> {
  await fetch("/api/progress/submissions", { method: "DELETE" });
}

export async function importLocalProgress(payload: {
  starred: string[];
  activity: ActivityEntry[];
}): Promise<void> {
  await fetch("/api/progress/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
