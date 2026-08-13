import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { Footer } from "@/components/footer";
import { Widget } from "@/components/widget";
import { DiscussionsFeed } from "@/components/discussions-feed";
import { listProblems } from "@/lib/api";
import { difficultyColor } from "@/lib/difficulty";

export default async function DiscussionsPage() {
  const problems = await listProblems();

  return (
    <>
      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-8 flex flex-col items-center gap-2 border-b pb-8 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessagesSquare className="size-5" />
          </div>
          <h1 className="text-2xl font-semibold">Discussions</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Recent activity across every problem&apos;s discussion thread — approaches, questions,
            and the occasional argument about <code className="rounded bg-muted px-1 py-0.5 text-foreground">awk</code> one-liners.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px] lg:items-start">
          <DiscussionsFeed />

          <Widget title="Problems">
            <div className="flex flex-col gap-1">
              {problems.map((p) => (
                <Link
                  key={p.slug}
                  href={`/problems/${p.slug}?tab=discussion`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  <span className={`shrink-0 text-xs capitalize ${difficultyColor(p.difficulty)}`}>
                    {p.difficulty}
                  </span>
                </Link>
              ))}
            </div>
          </Widget>
        </div>
      </main>
      <Footer />
    </>
  );
}
