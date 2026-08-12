"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import {
  submitSolution,
  runSolution,
  type SubmitResult,
  type ProblemSample,
} from "@/lib/api";
import { markSolved, recordActivity } from "@/lib/local-progress";

type Verdict = "Accepted" | "Wrong Answer";

type SampleRunResult = {
  verdict: Verdict;
  cases: { name: string; expected: string; actual: string; passed: boolean }[];
};

const VERDICT_VARIANT: Record<string, "secondary" | "destructive"> = {
  Accepted: "secondary",
  "Wrong Answer": "destructive",
  Timeout: "destructive",
  "No Tests Found": "destructive",
};

const VERDICT_COLOR: Record<string, string> = {
  Accepted: "text-emerald-500",
  "Wrong Answer": "text-rose-500",
  Timeout: "text-rose-500",
  "No Tests Found": "text-rose-500",
};

function VerdictBlock({
  verdict,
  elapsedSeconds,
  cases,
  note,
}: {
  verdict: string;
  elapsedSeconds?: number;
  cases: { name: string; expected: string; actual: string; passed: boolean }[];
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Badge variant={VERDICT_VARIANT[verdict]} className={VERDICT_COLOR[verdict]}>
          {verdict}
        </Badge>
        {elapsedSeconds !== undefined && (
          <span className="text-xs text-muted-foreground">{elapsedSeconds.toFixed(2)}s</span>
        )}
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      <div className="flex flex-col gap-2 text-sm">
        {cases.map((c) => (
          <div key={c.name} className="rounded border p-2 font-mono text-xs">
            <span className={c.passed ? "text-emerald-500" : "text-rose-500"}>
              {c.passed ? "PASS" : "FAIL"}
            </span>{" "}
            {c.name} — expected {JSON.stringify(c.expected)}, got {JSON.stringify(c.actual)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProblemWorkspace({
  slug,
  starterCode,
  samples,
}: {
  slug: string;
  starterCode: string;
  samples: ProblemSample[];
}) {
  const { resolvedTheme } = useTheme();
  const [code, setCode] = useState(starterCode);
  const [activeTab, setActiveTab] = useState<"testcase" | "result">("result");
  const [lastAction, setLastAction] = useState<"run" | "submit" | null>(null);

  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [sampleRun, setSampleRun] = useState<SampleRunResult | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    if (samples.length === 0) return;
    setRunning(true);
    setRunError(null);
    try {
      const cases = await Promise.all(
        samples.map(async (s, i) => {
          const res = await runSolution(slug, code, s.input);
          return {
            name: `Case ${i + 1}`,
            expected: s.expected,
            actual: res.output,
            passed: res.output === s.expected,
          };
        }),
      );
      setSampleRun({
        verdict: cases.every((c) => c.passed) ? "Accepted" : "Wrong Answer",
        cases,
      });
      setLastAction("run");
      setActiveTab("result");
    } catch {
      setRunError("Run failed — is the backend running?");
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitSolution(slug, code);
      setResult(res);
      recordActivity(slug, res.verdict, Date.now());
      if (res.verdict === "Accepted") markSolved(slug);
      setLastAction("submit");
      setActiveTab("result");
    } catch {
      setError("Submission failed — is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResizablePanelGroup orientation="vertical">
      <ResizablePanel defaultSize={65} minSize={30} className="flex flex-col">
        <div className="flex h-10 shrink-0 items-center justify-between border-b bg-card px-3">
          <span className="text-xs text-muted-foreground">bash</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRun}
              disabled={running || submitting || samples.length === 0}
            >
              {running ? "Running…" : "Run"}
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={running || submitting}>
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <Editor
            height="100%"
            defaultLanguage="shell"
            theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
            value={code}
            onChange={(value) => setCode(value ?? "")}
            options={{ minimap: { enabled: false }, fontSize: 13 }}
          />
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={35} minSize={15}>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "testcase" | "result")}
          className="flex h-full flex-col gap-0"
        >
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-3">
            <TabsTrigger value="testcase">Testcase</TabsTrigger>
            <TabsTrigger value="result">Result</TabsTrigger>
          </TabsList>

          <TabsContent value="testcase" className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-4 px-4 py-3">
                {samples.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No sample tests for this problem yet.
                  </p>
                )}
                {samples.map((s, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Case {i + 1}</p>
                    <div>
                      <p className="mb-1 text-[11px] text-muted-foreground">Input</p>
                      <pre className="overflow-x-auto rounded border bg-muted p-2 font-mono text-xs whitespace-pre-wrap">
                        {s.input}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] text-muted-foreground">Expected Output</p>
                      <pre className="overflow-x-auto rounded border bg-muted p-2 font-mono text-xs whitespace-pre-wrap">
                        {s.expected}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="result" className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <div className="px-4 py-3">
                {(lastAction === "run" ? runError : error) && (
                  <p className="text-sm text-destructive">
                    {lastAction === "run" ? runError : error}
                  </p>
                )}

                {!lastAction && !runError && !error && (
                  <p className="text-sm text-muted-foreground">
                    Run checks your code against the sample tests. Submit checks it against
                    the full hidden suite — that's what actually counts as solved.
                  </p>
                )}

                {lastAction === "run" && sampleRun && (
                  <VerdictBlock
                    verdict={sampleRun.verdict}
                    cases={sampleRun.cases}
                    note="Sample tests only — Submit to check against the full hidden suite."
                  />
                )}

                {lastAction === "submit" && result && (
                  <VerdictBlock
                    verdict={result.verdict}
                    elapsedSeconds={result.elapsed_seconds}
                    cases={result.tests}
                  />
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
