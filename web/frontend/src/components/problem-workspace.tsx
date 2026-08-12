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
};

const VERDICT_COLOR: Record<string, string> = {
  Accepted: "text-emerald-500",
  "Wrong Answer": "text-rose-500",
};

export function ProblemWorkspace({
  slug,
  starterCode,
  samples,
  onSubmitResult,
}: {
  slug: string;
  starterCode: string;
  samples: ProblemSample[];
  onSubmitResult: (result: SubmitResult) => void;
}) {
  const { resolvedTheme } = useTheme();
  const [code, setCode] = useState(starterCode);
  const [selectedCase, setSelectedCase] = useState(0);

  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [sampleRun, setSampleRun] = useState<SampleRunResult | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    } catch {
      setRunError("Run failed — is the backend running?");
    } finally {
      setRunning(false);
    }
  }

  // Result display for Submit lives in the left panel's Submissions tab
  // (see ProblemPageLayout/ProblemSubmissions) instead of here — this
  // just fires the request and hands the outcome up.
  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submitSolution(slug, code);
      recordActivity(slug, res.verdict, Date.now());
      if (res.verdict === "Accepted") markSolved(slug);
      onSubmitResult(res);
    } catch {
      setSubmitError("Submission failed — is the backend running?");
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
        <Tabs defaultValue="testcase" className="flex h-full flex-col gap-0">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-3">
            <TabsTrigger value="testcase">Testcase</TabsTrigger>
            <TabsTrigger value="result">Result</TabsTrigger>
          </TabsList>

          <TabsContent value="testcase" className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-3 px-4 py-3">
                {samples.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No sample tests for this problem yet.
                  </p>
                )}
                {samples.length > 0 && (
                  <>
                    <div className="flex flex-wrap gap-3">
                      {samples.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedCase(i)}
                          className={`rounded-full border px-4 py-2 text-xs transition-colors ${
                            selectedCase === i
                              ? "border-primary bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          }`}
                        >
                          Case {i + 1}
                        </button>
                      ))}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Input</p>
                      <pre className="overflow-x-auto rounded border bg-muted p-2 font-mono text-xs whitespace-pre-wrap">
                        {samples[selectedCase]?.input}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="result" className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <div className="px-4 py-3">
                {runError && <p className="text-sm text-destructive">{runError}</p>}
                {submitError && <p className="text-sm text-destructive">{submitError}</p>}

                {!sampleRun && !runError && !submitError && (
                  <p className="text-sm text-muted-foreground">
                    Run checks your code against the sample tests, shown here. Submit checks
                    it against the full hidden suite — that result appears in the
                    Submissions tab on the left.
                  </p>
                )}

                {sampleRun && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={VERDICT_VARIANT[sampleRun.verdict]}
                        className={VERDICT_COLOR[sampleRun.verdict]}
                      >
                        {sampleRun.verdict}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sample tests only — Submit to check against the full hidden suite.
                    </p>
                    <div className="flex flex-col gap-2 text-sm">
                      {sampleRun.cases.map((c) => (
                        <div key={c.name} className="rounded border p-2 font-mono text-xs">
                          <span className={c.passed ? "text-emerald-500" : "text-rose-500"}>
                            {c.passed ? "PASS" : "FAIL"}
                          </span>{" "}
                          {c.name} — expected {JSON.stringify(c.expected)}, got{" "}
                          {JSON.stringify(c.actual)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
