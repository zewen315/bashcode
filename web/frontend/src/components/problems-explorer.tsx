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
import { TagInput } from "@/components/tag-input";
import { cn } from "@/lib/utils";

const DIFFICULTIES = ["easy", "medium", "hard"];
const DIFFICULTY_RANK: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

const PROGRESS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "not-started", label: "Not started" },
  { value: "submitted", label: "Submitted" },
  { value: "unfinished", label: "Unfinished" },
  { value: "solved", label: "Solved" },
  { value: "starred", label: "Starred" },
];
const LIST_LABEL: Record<string, string> = Object.fromEntries(
  PROGRESS_OPTIONS.map((o) => [o.value, o.label]),
);

// The platform's declared taxonomy (per the README's V1 problem
// categories), unioned with whatever tags real problems actually have.
// Some of these won't match any problem yet — filtering to one honestly
// shows "No problems match your filters" rather than hiding the option
// until content catches up.
const CANONICAL_TOOLS = [
  "awk",
  "chmod",
  "cron",
  "curl",
  "cut",
  "find",
  "grep",
  "jq",
  "ps",
  "sed",
  "sort",
  "tar",
  "uniq",
  "xargs",
];
const CANONICAL_TOPICS = [
  "backups",
  "batch-operations",
  "cleanup-scripts",
  "config-management",
  "disk-usage",
  "file-permissions",
  "log-analysis",
  "monitoring",
  "networking",
  "process-management",
  "text-processing",
  "user-management",
];

type SortKey = "id" | "title" | "difficulty";
type Sort = { key: SortKey; dir: "asc" | "desc" } | null;

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown className="size-3 text-muted-foreground/50" />;
  return dir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />;
}

function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function ProblemsExplorer({ problems }: { problems: ProblemSummary[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listFilter = searchParams.get("list");

  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>(null);
  const [filterOpen, setFilterOpen] = useState(false);
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

  function handleProgressChange(value: string) {
    router.push(value === "all" ? "/problems" : `/problems?list=${value}`);
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
    () => Array.from(new Set([...CANONICAL_TOOLS, ...problems.flatMap((p) => p.tools)])).sort(),
    [problems],
  );
  const topics = useMemo(
    () => Array.from(new Set([...CANONICAL_TOPICS, ...problems.flatMap((p) => p.topics)])).sort(),
    [problems],
  );

  const activeFilterCount = [
    difficulty !== "all",
    selectedTools.length > 0,
    selectedTopics.length > 0,
    !!listFilter,
  ].filter(Boolean).length;

  const filtered = problems.filter((p) => {
    const matchesQuery = p.title.toLowerCase().includes(query.toLowerCase());
    const matchesDifficulty = difficulty === "all" || p.difficulty === difficulty;
    const matchesTool = selectedTools.length === 0 || p.tools.some((t) => selectedTools.includes(t));
    const matchesTopic =
      selectedTopics.length === 0 || p.topics.some((t) => selectedTopics.includes(t));
    const matchesList =
      !listFilter ||
      (listFilter === "starred" && starred.has(p.slug)) ||
      (listFilter === "submitted" && attempted.has(p.slug)) ||
      (listFilter === "unfinished" && attempted.has(p.slug) && !solved.has(p.slug)) ||
      (listFilter === "solved" && solved.has(p.slug)) ||
      (listFilter === "not-started" && !attempted.has(p.slug));
    return matchesQuery && matchesDifficulty && matchesTool && matchesTopic && matchesList;
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

  return (
    <div className="flex flex-col gap-4">
      <Widget title="Tools" className="shrink-0">
        <ProblemTags
          tags={tools}
          selected={selectedTools}
          onToggle={(t) => setSelectedTools((prev) => toggleInArray(prev, t))}
        />
      </Widget>

      <Widget title="Topics" className="shrink-0">
        <ProblemTags
          tags={topics}
          selected={selectedTopics}
          onToggle={(t) => setSelectedTopics((prev) => toggleInArray(prev, t))}
        />
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
                  value={listFilter ?? "all"}
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
                selected={selectedTools}
                onChange={setSelectedTools}
              />
              <TagInput
                label="Topics"
                options={topics}
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
            {sorted.map((p) => (
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
                    href="/discussions"
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
