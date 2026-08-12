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
  type RunResult,
  type ProblemSample,
} from "@/lib/api";
import { markSolved, recordActivity } from "@/lib/local-progress";

const VERDICT_VARIANT: Record<SubmitResult["verdict"], "secondary" | "destructive"> = {
  Accepted: "secondary",
  "Wrong Answer": "destructive",
  Timeout: "destructive",
  "No Tests Found": "destructive",
};

const VERDICT_COLOR: Record<SubmitResult["verdict"], string> = {
  Accepted: "text-emerald-500",
  "Wrong Answer": "text-rose-500",
  Timeout: "text-rose-500",
  "No Tests Found": "text-rose-500",
};

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
  const [activeTab, setActiveTab] = useState<"testcase" | "result">("testcase");

  const [input, setInput] = useState(samples[0]?.input ?? "");
  const [running, setRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only shown as a pass/fail comparison when the input box still exactly
  // matches a known sample — edit it at all and it's genuinely custom
  // input, with no expected value to compare against.
  const matchingSample = samples.find((s) => s.input === input);

  async function handleRun() {
    setRunning(true);
    setRunError(null);
    try {
      setRunOutput(await runSolution(slug, code, input));
      setActiveTab("testcase");
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
            <Button size="sm" variant="outline" onClick={handleRun} disabled={running || submitting}>
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
              <div className="flex flex-col gap-3 px-4 py-3">
                {samples.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {samples.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setInput(s.input);
                          setRunOutput(null);
                        }}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          input === s.input
                            ? "border-primary bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        Case {i + 1}
                      </button>
                    ))}
                  </div>
                )}

                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Input</p>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={5}
                    className="w-full resize-y rounded-md border bg-transparent p-2 font-mono text-xs outline-none focus:border-ring"
                    placeholder="Type input to try your own — Run uses whatever's here"
                  />
                </div>

                {runError && <p className="text-sm text-destructive">{runError}</p>}

                {runOutput && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-muted-foreground">Output</p>
                      {matchingSample && (
                        <span
                          className={
                            runOutput.output === matchingSample.expected
                              ? "text-xs text-emerald-500"
                              : "text-xs text-rose-500"
                          }
                        >
                          {runOutput.output === matchingSample.expected
                            ? "Matches expected"
                            : `Expected ${JSON.stringify(matchingSample.expected)}`}
                        </span>
                      )}
                    </div>
                    <pre className="overflow-x-auto rounded border bg-muted p-2 font-mono text-xs whitespace-pre-wrap">
                      {runOutput.output || "(no output)"}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="result" className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <div className="px-4 py-3">
                {error && <p className="text-sm text-destructive">{error}</p>}

                {!result && !error && (
                  <p className="text-sm text-muted-foreground">
                    Click Submit to run your code against the hidden tests.
                  </p>
                )}

                {result && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={VERDICT_VARIANT[result.verdict]}
                        className={VERDICT_COLOR[result.verdict]}
                      >
                        {result.verdict}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {result.elapsed_seconds.toFixed(2)}s
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                      {result.tests.map((t) => (
                        <div key={t.name} className="rounded border p-2 font-mono text-xs">
                          <span className={t.passed ? "text-emerald-500" : "text-rose-500"}>
                            {t.passed ? "PASS" : "FAIL"}
                          </span>{" "}
                          {t.name} — expected {JSON.stringify(t.expected)}, got{" "}
                          {JSON.stringify(t.actual)}
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
