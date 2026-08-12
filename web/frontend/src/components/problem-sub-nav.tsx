import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

export function ProblemSubNav({
  title,
  prevSlug,
  nextSlug,
}: {
  title: string;
  prevSlug?: string;
  nextSlug?: string;
}) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b bg-card px-3 text-sm">
      <Link
        href="/problems"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Problems
      </Link>

      <div className="mx-1 h-4 w-px bg-border" />

      {prevSlug ? (
        <Link
          href={`/problems/${prevSlug}`}
          aria-label="Previous problem"
          className="text-muted-foreground hover:text-foreground"
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
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <ChevronRight className="size-4 text-muted-foreground/30" />
      )}

      <span className="ml-2 truncate font-medium">{title}</span>
    </div>
  );
}
