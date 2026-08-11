import { Suspense } from "react";
import { listProblems } from "@/lib/api";
import { ProblemsSidebar } from "@/components/problems-sidebar";
import { ProblemsExplorer } from "@/components/problems-explorer";
import { ProblemsRightRail } from "@/components/problems-right-rail";
import { MyLists } from "@/components/my-lists";
import { Widget } from "@/components/widget";

export default async function ProblemsPage() {
  const problems = await listProblems();

  return (
    <main className="grid h-[calc(100vh-3rem)] grid-cols-[260px_1fr_320px] gap-4 overflow-hidden bg-muted/30 p-4">
      <aside className="flex flex-col gap-4 overflow-y-auto">
        <Widget>
          <ProblemsSidebar />
        </Widget>
        <Widget title="My Lists">
          <Suspense fallback={null}>
            <MyLists />
          </Suspense>
        </Widget>
      </aside>
      <section className="overflow-y-auto">
        <Suspense fallback={null}>
          <ProblemsExplorer problems={problems} />
        </Suspense>
      </section>
      <aside className="overflow-y-auto">
        <ProblemsRightRail problems={problems} today={new Date()} />
      </aside>
    </main>
  );
}
