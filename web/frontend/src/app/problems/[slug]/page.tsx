import { notFound } from "next/navigation";
import { getProblem, listProblems } from "@/lib/api";
import { ProblemPageLayout } from "@/components/problem-page-layout";
import { ProblemSubNav } from "@/components/problem-sub-nav";
import { Footer } from "@/components/footer";

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [problem, problems] = await Promise.all([
    getProblem(slug).catch(() => null),
    listProblems(),
  ]);
  if (!problem) notFound();

  // Prev/next follow the backend's default (alphabetical-by-slug) order,
  // not whatever sort/filter the user had applied on the list page —
  // that's client-side state this server component has no access to.
  const index = problems.findIndex((p) => p.slug === slug);
  const prevSlug = index > 0 ? problems[index - 1].slug : undefined;
  const nextSlug = index >= 0 && index < problems.length - 1 ? problems[index + 1].slug : undefined;

  return (
    <>
      <ProblemSubNav title={problem.title} prevSlug={prevSlug} nextSlug={nextSlug} />
      <ProblemPageLayout problem={problem} />
      <Footer />
    </>
  );
}
