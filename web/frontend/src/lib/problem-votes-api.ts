export type ProblemVotes = {
  upvotes: number;
  downvotes: number;
  my_vote: 1 | -1 | null;
};

export async function fetchProblemVotes(slug: string): Promise<ProblemVotes | null> {
  const res = await fetch(`/api/problems/${slug}/vote`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function voteProblem(slug: string, value: 1 | -1): Promise<ProblemVotes | null> {
  const res = await fetch(`/api/problems/${slug}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function unvoteProblem(slug: string): Promise<ProblemVotes | null> {
  const res = await fetch(`/api/problems/${slug}/vote`, { method: "DELETE" });
  if (!res.ok) return null;
  return res.json();
}
