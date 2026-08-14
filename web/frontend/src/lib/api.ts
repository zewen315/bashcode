const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8123";

export type ProblemSummary = {
  id: number;
  slug: string;
  title: string;
  difficulty: string;
  tools: string[];
  topics: string[];
};

export type ProblemInputFile = {
  name: string;
  content: string;
};

export type ProblemSample = {
  files: ProblemInputFile[];
  expected: string;
};

export type ProblemDetail = ProblemSummary & {
  time_limit_seconds: number;
  memory_limit_mb: number;
  description: string;
  starter_code: string;
  solution_explanation: string;
  samples: ProblemSample[];
};

export type TestFile = { name: string; content: string };

export type TestResult = {
  name: string;
  expected: string;
  actual: string;
  files: TestFile[];
  exit_code: string;
  passed: boolean;
};

export type SubmitResult = {
  slug: string;
  verdict: "Accepted" | "Wrong Answer" | "Timeout" | "No Tests Found";
  tests: TestResult[];
  elapsed_seconds: number;
};

// The reduced shape both the live submit result and a fetched
// historical submission's details get normalized into before
// rendering — see SubmissionResult in problem-submissions.tsx. Never
// the full per-test array (judge results can be huge; only the first
// failure is ever shown, live or historical).
export type SubmissionResultData = {
  verdict: SubmitResult["verdict"];
  elapsed_seconds: number;
  total_tests: number;
  first_failure: { name: string; expected: string; actual: string; files: TestFile[] } | null;
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

export type RunResult = {
  output: string;
  exit_code: string;
};

// Never a grading pass, even when `inputs` happens to match a known
// sample — this always just returns raw output. Comparing against a
// sample's expected value (when applicable) is a client-side concern.
export async function runSolution(
  slug: string,
  code: string,
  inputs: Record<string, string>,
): Promise<RunResult> {
  const res = await fetch(`${API_URL}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, code, inputs }),
  });
  if (!res.ok) throw new Error(`run failed (${res.status})`);
  return res.json();
}

// `website` is a honeypot — always sent empty by the real form (the
// field is visually hidden from real users via CSS). Never surfaced as
// a real field in the UI.
export async function sendFeedback(
  message: string,
  email: string,
  website: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, email: email || null, website }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `feedback failed (${res.status})`);
  }
}
