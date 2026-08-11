"use client";

import { useEffect, useState } from "react";
import { type ProblemSummary } from "@/lib/api";
import { getSolvedSlugs } from "@/lib/local-progress";

// Validated via the dataviz skill's palette validator against both the
// light and dark chart surfaces (all checks pass) — deliberately a
// distinct shade from the emerald/amber/rose-500 text colors used
// elsewhere (difficulty.ts), since a thick ring segment needs a
// different lightness band than small text does.
const DIFFICULTIES: { key: string; label: string; color: string }[] = [
  { key: "easy", label: "Easy", color: "#059669" },
  { key: "medium", label: "Medium", color: "#d97706" },
  { key: "hard", label: "Hard", color: "#be123c" },
];

const RADIUS = 42;
const STROKE = 10;
const GAP = 2; // percentage points of circumference, between segments

export function StatusChart({ problems }: { problems: ProblemSummary[] }) {
  const [solved, setSolved] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSolved(getSolvedSlugs());
  }, []);

  const total = problems.length;
  const solvedCount = problems.filter((p) => solved.has(p.slug)).length;

  const counts = DIFFICULTIES.map(({ key, label, color }) => {
    const inDifficulty = problems.filter((p) => p.difficulty === key);
    const solvedInDifficulty = inDifficulty.filter((p) => solved.has(p.slug)).length;
    return { key, label, color, solved: solvedInDifficulty, total: inDifficulty.length };
  });

  let offset = 0;
  const segments = counts
    .filter((c) => c.total > 0)
    .map((c) => {
      const length = total > 0 ? (c.solved / total) * 100 : 0;
      const drawn = Math.max(0, length - (length > 0 ? GAP : 0));
      const seg = { ...c, drawn, offset };
      offset += length;
      return seg;
    });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="size-24 shrink-0">
        {/* Rotate only the ring so segments start at 12 o'clock; text stays upright. */}
        <g transform="rotate(-90 50 50)">
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={STROKE}
          />
          {segments.map((seg) => (
            <circle
              key={seg.key}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${seg.drawn} ${100 - seg.drawn}`}
              strokeDashoffset={-seg.offset}
            />
          ))}
        </g>
        <text
          x="50"
          y="47"
          textAnchor="middle"
          className="fill-foreground text-[22px] font-semibold"
        >
          {solvedCount}
        </text>
        <text x="50" y="63" textAnchor="middle" className="fill-muted-foreground text-[10px]">
          / {total} solved
        </text>
      </svg>

      <div className="flex flex-col gap-1.5 text-xs">
        {counts.map((c) => (
          <div key={c.key} className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="text-muted-foreground">{c.label}</span>
            <span className="ml-auto font-medium text-foreground">
              {c.solved}/{c.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
