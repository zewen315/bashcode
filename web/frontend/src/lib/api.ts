const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8123";

export type ProblemSummary = {
  slug: string;
  title: string;
  difficulty: string;
  tools: string[];
  topics: string[];
};

export type ProblemDetail = ProblemSummary & {
  time_limit_seconds: number;
  memory_limit_mb: number;
  description: string;
  starter_code: string;
};

export type TestResult = {
  name: string;
  expected: string;
  actual: string;
  exit_code: string;
  passed: boolean;
};

export type SubmitResult = {
  slug: string;
  verdict: "Accepted" | "Wrong Answer" | "Timeout" | "No Tests Found";
  tests: TestResult[];
  elapsed_seconds: number;
};

export async function listProblems(): Promise<ProblemSummary[]> {
  const res = await fetch(`${API_URL}/problems`, { cache: "no-store" });
  if (!res.ok) throw new Error(`failed to load problems (${res.status})`);
  return res.json();
}

export async function getProblem(slug: string): Promise<ProblemDetail> {
  const res = await fetch(`${API_URL}/problems/${slug}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`failed to load problem (${res.status})`);
  return res.json();
}

export async function submitSolution(slug: string, code: string): Promise<SubmitResult> {
  const res = await fetch(`${API_URL}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, code }),
  });
  if (!res.ok) throw new Error(`submit failed (${res.status})`);
  return res.json();
}
