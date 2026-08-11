"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, CheckCircle2, Circle, Star, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type ProblemSummary } from "@/lib/api";
import { difficultyColor } from "@/lib/difficulty";
import { getSolvedSlugs, getStarredSlugs, toggleStarred } from "@/lib/local-progress";

const DIFFICULTIES = ["easy", "medium", "hard"];

export function ProblemsExplorer({ problems }: { problems: ProblemSummary[] }) {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [category, setCategory] = useState("all");
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [starred, setStarred] = useState<Set<string>>(new Set());

  // Solved/starred state lives in localStorage, so it can only be read
  // after mount — reading it during SSR would always show empty.
  useEffect(() => {
    setSolved(getSolvedSlugs());
    setStarred(getStarredSlugs());
  }, []);

  function handleToggleStar(slug: string) {
    setStarred(new Set(toggleStarred(slug)));
  }

  const categories = useMemo(
    () => Array.from(new Set(problems.map((p) => p.category))).sort(),
    [problems],
  );

  const filtered = problems.filter((p) => {
    const matchesQuery = p.title.toLowerCase().includes(query.toLowerCase());
    const matchesDifficulty = difficulty === "all" || p.difficulty === difficulty;
    const matchesCategory = category === "all" || p.category === category;
    return matchesQuery && matchesDifficulty && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search problems"
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Select value={difficulty} onValueChange={(v) => setDifficulty(v ?? "all")}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All difficulties</SelectItem>
            {DIFFICULTIES.map((d) => (
              <SelectItem key={d} value={d} className="capitalize">
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={(v) => setCategory(v ?? "all")}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 text-center">Status</TableHead>
              <TableHead className="w-10 text-center">Star</TableHead>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Problem</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead className="w-16 text-center">Discuss</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p, i) => (
              <TableRow key={p.slug}>
                <TableCell className="text-center">
                  {solved.has(p.slug) ? (
                    <CheckCircle2 className="mx-auto size-4 text-emerald-500" />
                  ) : (
                    <Circle className="mx-auto size-4 text-muted-foreground/40" />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <button
                    type="button"
                    onClick={() => handleToggleStar(p.slug)}
                    aria-label={starred.has(p.slug) ? "Unstar problem" : "Star problem"}
                    className="text-muted-foreground/40 hover:text-amber-500"
                  >
                    <Star
                      className={
                        starred.has(p.slug)
                          ? "mx-auto size-4 fill-amber-400 text-amber-400"
                          : "mx-auto size-4"
                      }
                    />
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">
                  <Link href={`/problems/${p.slug}`} className="hover:text-primary">
                    {p.title}
                  </Link>
                </TableCell>
                <TableCell className={`capitalize ${difficultyColor(p.difficulty)}`}>
                  {p.difficulty}
                </TableCell>
                <TableCell className="text-center">
                  <Link
                    href="/discussions"
                    aria-label="Discuss this problem"
                    className="inline-flex text-muted-foreground/60 hover:text-foreground"
                  >
                    <MessageSquare className="size-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No problems match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
