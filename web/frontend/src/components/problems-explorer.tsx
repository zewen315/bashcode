"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  CheckCircle2,
  Circle,
  Star,
  MessageSquare,
  SlidersHorizontal,
  Shuffle,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import {
  getSolvedSlugs,
  getStarredSlugs,
  toggleStarred,
  getAttemptedSlugs,
} from "@/lib/local-progress";
import { Widget } from "@/components/widget";
import { ProblemTags } from "@/components/problem-tags";

const DIFFICULTIES = ["easy", "medium", "hard"];
const LIST_LABEL: Record<string, string> = { starred: "Starred", submitted: "Submitted" };

export function ProblemsExplorer({ problems }: { problems: ProblemSummary[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listFilter = searchParams.get("list");

  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [category, setCategory] = useState("all");
  const [tag, setTag] = useState<string | null>(null);
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [attempted, setAttempted] = useState<Set<string>>(new Set());

  // Solved/starred/attempted state lives in localStorage, so it can only
  // be read after mount — reading it during SSR would always show empty.
  useEffect(() => {
    setSolved(getSolvedSlugs());
    setStarred(getStarredSlugs());
    setAttempted(getAttemptedSlugs());
  }, []);

  function handleToggleStar(slug: string) {
    setStarred(new Set(toggleStarred(slug)));
  }

  function handleRandom() {
    if (problems.length === 0) return;
    const pick = problems[Math.floor(Math.random() * problems.length)];
    router.push(`/problems/${pick.slug}`);
  }

  const categories = useMemo(
    () => Array.from(new Set(problems.map((p) => p.category))).sort(),
    [problems],
  );
  const tags = useMemo(
    () => Array.from(new Set(problems.flatMap((p) => p.tags))).sort(),
    [problems],
  );

  const filtered = problems.filter((p) => {
    const matchesQuery = p.title.toLowerCase().includes(query.toLowerCase());
    const matchesDifficulty = difficulty === "all" || p.difficulty === difficulty;
    const matchesCategory = category === "all" || p.category === category;
    const matchesTag = !tag || p.tags.includes(tag);
    const matchesList =
      !listFilter ||
      (listFilter === "starred" && starred.has(p.slug)) ||
      (listFilter === "submitted" && attempted.has(p.slug));
    return matchesQuery && matchesDifficulty && matchesCategory && matchesTag && matchesList;
  });

  return (
    <div className="flex flex-col gap-4">
      <Widget title="Tags">
        <ProblemTags tags={tags} selected={tag} onSelect={setTag} />
      </Widget>

      <Widget bodyClassName="flex flex-wrap items-center gap-2">
        {listFilter && (
          <Link
            href="/problems"
            className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground"
          >
            {LIST_LABEL[listFilter] ?? listFilter}
            <X className="size-3" />
          </Link>
        )}
        <div className="relative min-w-48 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search problems"
            className="h-8 pl-8 text-sm"
          />
        </div>

        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="icon" className="size-8" aria-label="Filter" />
            }
          >
            <SlidersHorizontal className="size-4" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56">
            <div className="flex flex-col gap-2">
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v ?? "all")}>
                <SelectTrigger size="sm" className="w-full">
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
                <SelectTrigger size="sm" className="w-full">
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
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          aria-label="Random problem"
          onClick={handleRandom}
        >
          <Shuffle className="size-4" />
        </Button>
      </Widget>

      <Widget bodyClassName="p-0" className="overflow-hidden">
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
      </Widget>
    </div>
  );
}
