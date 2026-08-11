import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { getProblem } from "@/lib/api";
import { ProblemWorkspace } from "@/components/problem-workspace";

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const problem = await getProblem(slug).catch(() => null);
  if (!problem) notFound();

  return (
    <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-2">
      <div>
        <div className="mb-4 flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{problem.title}</h1>
          <Badge variant="outline">{problem.difficulty}</Badge>
        </div>
        <article className="text-sm leading-6 text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_h1]:hidden [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:mb-4 [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5">
          <ReactMarkdown>{problem.description}</ReactMarkdown>
        </article>
      </div>
      <ProblemWorkspace slug={problem.slug} starterCode={problem.starter_code} />
    </main>
  );
}
