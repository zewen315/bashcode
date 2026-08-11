import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listProblems } from "@/lib/api";
import { difficultyColor } from "@/lib/difficulty";

export default async function ProblemsPage() {
  const problems = await listProblems();

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8">
      <h1 className="mb-4 text-lg font-semibold">Problems</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">#</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Difficulty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {problems.map((p, i) => (
              <TableRow key={p.slug} className="cursor-pointer">
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">
                  <Link href={`/problems/${p.slug}`} className="hover:text-primary">
                    {p.title}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.category}</TableCell>
                <TableCell className={`text-right capitalize ${difficultyColor(p.difficulty)}`}>
                  {p.difficulty}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
