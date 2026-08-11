import { Trophy } from "lucide-react";

export function LeaderboardPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-2 py-2 text-center">
      <Trophy className="size-6 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">
        Percentile ranking needs accounts and cross-user stats, neither of
        which exist yet.
      </p>
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
        Soon
      </span>
    </div>
  );
}
