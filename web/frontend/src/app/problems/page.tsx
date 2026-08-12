import { Suspense } from "react";
import { listProblems } from "@/lib/api";
import { ProblemsSidebar } from "@/components/problems-sidebar";
import { ProblemsExplorer } from "@/components/problems-explorer";
import { ProblemsRightRail } from "@/components/problems-right-rail";
import { Shortcuts } from "@/components/shortcuts";
import { Widget } from "@/components/widget";
import { Footer } from "@/components/footer";
import { MobileMenu } from "@/components/mobile-menu";

export default async function ProblemsPage() {
  const problems = await listProblems();
  const today = new Date();

  return (
    <>
      <main className="grid grid-cols-1 gap-4 bg-muted/30 p-4 lg:grid-cols-[260px_1fr_320px] lg:items-start">
        <aside className="hidden min-w-0 flex-col gap-4 lg:flex">
          <Widget>
            <ProblemsSidebar />
          </Widget>
          <Widget title="Shortcuts">
            <Suspense fallback={null}>
              <Shortcuts totalCount={problems.length} />
            </Suspense>
          </Widget>
        </aside>
        <section className="flex min-w-0 flex-col gap-4">
          <MobileMenu problems={problems} today={today} />
          <Suspense fallback={null}>
            <ProblemsExplorer problems={problems} />
          </Suspense>
        </section>
        <aside className="hidden min-w-0 lg:block">
          <ProblemsRightRail problems={problems} today={today} />
        </aside>
      </main>
      <Footer />
    </>
  );
}
