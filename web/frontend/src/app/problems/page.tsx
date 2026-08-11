import { listProblems } from "@/lib/api";
import { ProblemsSidebar } from "@/components/problems-sidebar";
import { ProblemsExplorer } from "@/components/problems-explorer";
import { ProblemsRightRail } from "@/components/problems-right-rail";

export default async function ProblemsPage() {
  const problems = await listProblems();

  return (
    <main className="grid h-[calc(100vh-3rem)] grid-cols-[200px_1fr_260px] overflow-hidden">
      <aside className="overflow-y-auto border-r">
        <ProblemsSidebar />
      </aside>
      <section className="overflow-y-auto">
        <ProblemsExplorer problems={problems} />
      </section>
      <aside className="overflow-y-auto border-l">
        <ProblemsRightRail today={new Date()} />
      </aside>
    </main>
  );
}
