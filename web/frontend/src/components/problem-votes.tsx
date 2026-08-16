"use client";

import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  fetchProblemVotes,
  voteProblem,
  unvoteProblem,
  type ProblemVotes as ProblemVotesData,
} from "@/lib/problem-votes-api";

function VoteButton({
  active,
  count,
  onClick,
  label,
  icon: Icon,
  activeColor,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  label: string;
  icon: typeof ThumbsUp;
  activeColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        active && activeColor,
      )}
    >
      <Icon className={cn("size-3.5", active && "fill-current")} />
      {count > 0 && count}
    </button>
  );
}

export function ProblemVotes({ slug }: { slug: string }) {
  const { user, loading: authLoading } = useAuth();
  const [votes, setVotes] = useState<ProblemVotesData | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    fetchProblemVotes(slug).then((result) => {
      if (!cancelled) setVotes(result);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, authLoading]);

  async function handleVoteClick(value: 1 | -1) {
    if (!user) return;
    const result = votes?.my_vote === value ? await unvoteProblem(slug) : await voteProblem(slug, value);
    if (result) setVotes(result);
  }

  if (!votes) return null;

  return (
    <div className="mb-4 flex items-center gap-2">
      <VoteButton
        active={votes.my_vote === 1}
        count={votes.upvotes}
        onClick={() => handleVoteClick(1)}
        label="Upvote"
        icon={ThumbsUp}
        activeColor="border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
      />
      <VoteButton
        active={votes.my_vote === -1}
        count={votes.downvotes}
        onClick={() => handleVoteClick(-1)}
        label="Downvote"
        icon={ThumbsDown}
        activeColor="border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400"
      />
      {!user && !authLoading && (
        <span className="text-xs text-muted-foreground">Sign in to vote on this problem.</span>
      )}
    </div>
  );
}
