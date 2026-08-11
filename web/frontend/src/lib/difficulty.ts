export const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-500",
  hard: "text-rose-500",
};

export function difficultyColor(difficulty: string): string {
  return DIFFICULTY_COLOR[difficulty] ?? "text-muted-foreground";
}
