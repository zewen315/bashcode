import { listProblems } from "@/lib/api";
import { ProblemsSidebar } from "@/components/problems-sidebar";
import { ProblemsExplorer } from "@/components/problems-explorer";
import { ProblemsRightRail } from "@/components/problems-right-rail";
import { Widget } from "@/components/widget";

export default async function ProblemsPage() {
  const problems = await listProblems();

  return (
    <main className="grid h-[calc(100vh-3rem)] grid-cols-[260px_1fr_320px] gap-4 overflow-hidden bg-muted/30 p-4">
      <aside className="overflow-y-auto">
        <Widget>
          <ProblemsSidebar />
        </Widget>
      </aside>
      <section className="overflow-y-auto">
        <ProblemsExplorer problems={problems} />
      </section>
      <aside className="overflow-y-auto">
        <ProblemsRightRail problems={problems} today={new Date()} />
      </aside>
    </main>
  );
}
