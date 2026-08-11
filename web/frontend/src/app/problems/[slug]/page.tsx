import { notFound } from "next/navigation";
import { getProblem } from "@/lib/api";
import { ProblemPageLayout } from "@/components/problem-page-layout";
import { Footer } from "@/components/footer";

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const problem = await getProblem(slug).catch(() => null);
  if (!problem) notFound();

  return (
    <>
      <ProblemPageLayout problem={problem} />
      <Footer />
    </>
  );
}
