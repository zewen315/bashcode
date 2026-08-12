"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ListChecks,
  MessagesSquare,
  Info,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Shuffle,
} from "lucide-react";
import { listProblems, type ProblemSummary } from "@/lib/api";

const NAV_LINKS = [
  { label: "Problems", href: "/problems", icon: ListChecks },
  { label: "Discussions", href: "/discussions", icon: MessagesSquare },
  { label: "About", href: "/about", icon: Info },
];

// The nav bar lives in the root layout, which has no access to a page's
// own fetched data — so on an individual problem page, this fetches
// listProblems() itself (client-side) to compute prev/next/random,
// rather than threading that data down from the page component.
export function NavLinks() {
  const pathname = usePathname();
  const router = useRouter();
  const currentSlug = pathname.match(/^\/problems\/([^/]+)$/)?.[1];

  const [problems, setProblems] = useState<ProblemSummary[]>([]);

  useEffect(() => {
    if (!currentSlug) return;
    listProblems()
      .then(setProblems)
      .catch(() => setProblems([]));
  }, [currentSlug]);

  function handleRandom() {
    if (problems.length === 0) return;
    const pick = problems[Math.floor(Math.random() * problems.length)];
    router.push(`/problems/${pick.slug}`);
  }

  if (currentSlug) {
    const index = problems.findIndex((p) => p.slug === currentSlug);
    const prevSlug = index > 0 ? problems[index - 1].slug : undefined;
    const nextSlug =
      index >= 0 && index < problems.length - 1 ? problems[index + 1].slug : undefined;

    return (
      <nav className="flex items-center gap-3 text-sm text-muted-foreground sm:gap-4">
        <Link href="/problems" className="flex items-center gap-1.5 hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          <span className="hidden sm:inline">Problems</span>
        </Link>

        {prevSlug ? (
          <Link
            href={`/problems/${prevSlug}`}
            aria-label="Previous problem"
            className="hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </Link>
        ) : (
          <ChevronLeft className="size-4 text-muted-foreground/30" />
        )}
        {nextSlug ? (
          <Link
            href={`/problems/${nextSlug}`}
            aria-label="Next problem"
            className="hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <ChevronRight className="size-4 text-muted-foreground/30" />
        )}

        <button
          type="button"
          onClick={handleRandom}
          aria-label="Random problem"
          className="hover:text-foreground"
        >
          <Shuffle className="size-4" />
        </button>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-3 text-sm text-muted-foreground sm:gap-4">
      {NAV_LINKS.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-1.5 hover:text-foreground"
          aria-label={label}
        >
          <Icon className="size-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
