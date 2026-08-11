import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { listProblems } from "@/lib/api";

const DIFFICULTY_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  easy: "secondary",
  medium: "default",
  hard: "destructive",
};

export default async function ProblemsPage() {
  const problems = await listProblems();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-semibold">Problems</h1>
      <div className="flex flex-col gap-3">
        {problems.map((p) => (
          <Link key={p.slug} href={`/problems/${p.slug}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base font-medium">{p.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{p.category}</Badge>
                  <Badge variant={DIFFICULTY_VARIANT[p.difficulty] ?? "default"}>
                    {p.difficulty}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
