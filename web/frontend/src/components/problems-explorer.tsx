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
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
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
import { useProgress } from "@/lib/progress-context";
import { Widget } from "@/components/widget";
import { ProblemTags } from "@/components/problem-tags";
import { TagInput } from "@/components/tag-input";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const DIFFICULTIES = ["easy", "medium", "hard"];
const DIFFICULTY_RANK: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

// Finished / Attempted / Not started are mutually exclusive and
// exhaustive — every problem is in exactly one. Star is a separate,
// orthogonal filter (a problem can be starred regardless of progress),
// so it's not one of these values; see starredOnly below.
const PROGRESS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "finished", label: "Finished" },
  { value: "attempted", label: "Attempted" },
  { value: "not-started", label: "Not started" },
];
const PROGRESS_LABEL: Record<string, string> = Object.fromEntries(
  PROGRESS_OPTIONS.map((o) => [o.value, o.label]),
);

type SortKey = "id" | "title" | "difficulty";
type Sort = { key: SortKey; dir: "asc" | "desc" } | null;

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown className="size-3 text-muted-foreground/50" />;
  return dir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />;
}

function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function countBy(problems: ProblemSummary[], getTags: (p: ProblemSummary) => string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of problems) {
    for (const tag of getTags(p)) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return counts;
}

export function ProblemsExplorer({ problems }: { problems: ProblemSummary[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const progressFilter = searchParams.get("progress");
  const starredOnly = searchParams.get("starred") === "1";

  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>(null);
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const { solved, starred, attempted, toggleStar } = useProgress();

  function handleToggleStar(slug: string) {
    toggleStar(slug);
  }

  function handleRandom() {
    if (problems.length === 0) return;
    const pick = problems[Math.floor(Math.random() * problems.length)];
    router.push(`/problems/${pick.slug}`);
  }

  // Progress and star are independent filters that can both be active
  // at once (e.g. "starred AND not started"), so changing one must
  // preserve the other's query param rather than overwriting the URL.
  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.push(qs ? `/problems?${qs}` : "/problems");
  }

  function handleProgressChange(value: string) {
    updateParam("progress", value === "all" ? null : value);
  }

  function handleToggleStarredOnly() {
    updateParam("starred", starredOnly ? null : "1");
  }

  function hrefWithout(key: string): string {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    const qs = params.toString();
    return qs ? `/problems?${qs}` : "/problems";
  }

  function handleClearFilters() {
    setDifficulty("all");
    setSelectedTools([]);
    setSelectedTopics([]);
    router.push("/problems");
  }

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  const tools = useMemo(
    () => Array.from(new Set(problems.flatMap((p) => p.tools))).sort(),
    [problems],
  );
  const topics = useMemo(
    () => Array.from(new Set(problems.flatMap((p) => p.topics))).sort(),
    [problems],
  );
  // Global counts (how many problems have this tag at all) — deliberately
  // not recomputed against the currently-filtered set, so the numbers
  // stay stable while multi-selecting tags instead of shifting around
  // as each click narrows the result.
  const toolCounts = useMemo(() => countBy(problems, (p) => p.tools), [problems]);
  const topicCounts = useMemo(() => countBy(problems, (p) => p.topics), [problems]);

  const activeFilterCount = [
    difficulty !== "all",
    selectedTools.length > 0,
    selectedTopics.length > 0,
    !!progressFilter,
    starredOnly,
  ].filter(Boolean).length;

  const filtered = problems.filter((p) => {
    const matchesQuery = p.title.toLowerCase().includes(query.toLowerCase());
    const matchesDifficulty = difficulty === "all" || p.difficulty === difficulty;
    const matchesTool = selectedTools.length === 0 || p.tools.some((t) => selectedTools.includes(t));
    const matchesTopic =
      selectedTopics.length === 0 || p.topics.some((t) => selectedTopics.includes(t));
    const matchesProgress =
      !progressFilter ||
      (progressFilter === "finished" && solved.has(p.slug)) ||
      (progressFilter === "attempted" && attempted.has(p.slug) && !solved.has(p.slug)) ||
      (progressFilter === "not-started" && !attempted.has(p.slug));
    const matchesStar = !starredOnly || starred.has(p.slug);
    return (
      matchesQuery && matchesDifficulty && matchesTool && matchesTopic && matchesProgress && matchesStar
    );
  });

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const arr = [...filtered];
    if (sort.key === "id") {
      arr.sort((a, b) => a.id - b.id);
    } else if (sort.key === "title") {
      arr.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort.key === "difficulty") {
      arr.sort((a, b) => (DIFFICULTY_RANK[a.difficulty] ?? 0) - (DIFFICULTY_RANK[b.difficulty] ?? 0));
    }
    if (sort.dir === "desc") arr.reverse();
    return arr;
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  // Whenever the filters/sort narrow or reorder the result set, land back
  // on page 1 rather than leaving the user stranded on a now-out-of-range
  // page (e.g. page 3 of a filtered set that only has 1 page left).
  useEffect(() => {
    setPage(1);
  }, [query, difficulty, selectedTools, selectedTopics, progressFilter, starredOnly, sort]);
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <Widget title="Tools" className="shrink-0">
        <ProblemTags
          tags={tools}
          counts={toolCounts}
          selected={selectedTools}
          onToggle={(t) => setSelectedTools((prev) => toggleInArray(prev, t))}
        />
      </Widget>

      <Widget title="Topics" className="shrink-0">
        <ProblemTags
          tags={topics}
          counts={topicCounts}
          selected={selectedTopics}
          onToggle={(t) => setSelectedTopics((prev) => toggleInArray(prev, t))}
        />
      </Widget>

      <Widget bodyClassName="flex flex-wrap items-center gap-2">
        {progressFilter && (
          <Link
            href={hrefWithout("progress")}
            className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground"
          >
            {PROGRESS_LABEL[progressFilter] ?? progressFilter}
            <X className="size-3" />
          </Link>
        )}
        {starredOnly && (
          <Link
            href={hrefWithout("starred")}
            className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground"
          >
            Starred
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

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          aria-label={starredOnly ? "Show all problems" : "Show starred problems only"}
          aria-pressed={starredOnly}
          onClick={handleToggleStarredOnly}
        >
          <Star className={starredOnly ? "size-4 fill-amber-400 text-amber-400" : "size-4"} />
        </Button>

        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="relative size-8"
                aria-label="Filter"
              />
            }
          >
            <SlidersHorizontal className="size-4" />
            {activeFilterCount > 0 && (
              <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className="max-h-[70vh] w-64 overflow-y-auto">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
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
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Progress</label>
                <Select
                  value={progressFilter ?? "all"}
                  onValueChange={(v) => handleProgressChange(v ?? "all")}
                >
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue placeholder="Progress" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRESS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <TagInput
                label="Tools"
                options={tools}
                counts={toolCounts}
                selected={selectedTools}
                onChange={setSelectedTools}
              />
              <TagInput
                label="Topics"
                options={topics}
                counts={topicCounts}
                selected={selectedTopics}
                onChange={setSelectedTopics}
              />

              <div className="mt-1 flex items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  Clear
                </Button>
                <Button size="sm" onClick={() => setFilterOpen(false)}>
                  Apply
                </Button>
              </div>
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
        {pageCount > 1 && (
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2 text-sm">
            <span className="text-xs text-muted-foreground">
              Page {page} of {pageCount}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 text-center">Status</TableHead>
              <TableHead className="w-10 text-center">Star</TableHead>
              <TableHead className="w-12">
                <button
                  type="button"
                  onClick={() => toggleSort("id")}
                  className={cn(
                    "flex items-center gap-1 hover:text-foreground",
                    sort?.key === "id" && "font-semibold text-foreground",
                  )}
                >
                  ID <SortIcon active={sort?.key === "id"} dir={sort?.dir ?? "asc"} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("title")}
                  className={cn(
                    "flex items-center gap-1 hover:text-foreground",
                    sort?.key === "title" && "font-semibold text-foreground",
                  )}
                >
                  Problem <SortIcon active={sort?.key === "title"} dir={sort?.dir ?? "asc"} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort("difficulty")}
                  className={cn(
                    "flex items-center gap-1 hover:text-foreground",
                    sort?.key === "difficulty" && "font-semibold text-foreground",
                  )}
                >
                  Difficulty{" "}
                  <SortIcon active={sort?.key === "difficulty"} dir={sort?.dir ?? "asc"} />
                </button>
              </TableHead>
              <TableHead className="w-16 text-center">Discuss</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((p) => (
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
                <TableCell className="text-muted-foreground">{p.id}</TableCell>
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
                    href={`/problems/${p.slug}?tab=discussion`}
                    aria-label="Discuss this problem"
                    className="inline-flex text-muted-foreground/60 hover:text-foreground"
                  >
                    <MessageSquare className="size-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
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
