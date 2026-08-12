import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listProblems } from "@/lib/api";
import { ActivityList } from "@/components/activity-list";
import { Footer } from "@/components/footer";

export default async function ActivityPage() {
  const problems = await listProblems();

  return (
    <>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/problems"
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Problems
        </Link>
        <h1 className="mb-6 text-2xl font-semibold">Activity</h1>
        <ActivityList problems={problems} />
      </main>
      <Footer />
    </>
  );
}
