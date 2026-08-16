"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import ReactMarkdown from "react-markdown";
import { RotateCcw } from "lucide-react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";
import {
  submitSolution,
  runSolution,
  type SubmitResult,
  type ProblemSample,
} from "@/lib/api";
import { useProgress } from "@/lib/progress-context";
import { getSavedCode, saveCode, clearSavedCode } from "@/lib/editor-draft";

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
  const { recordSubmission } = useProgress();
  const [code, setCode] = useState(starterCode);
  const [selectedCase, setSelectedCase] = useState(0);

  // Restore whatever was last typed for this problem, if anything —
  // runs after mount since localStorage isn't available during SSR.
  useEffect(() => {
    const saved = getSavedCode(slug);
    if (saved !== null) setCode(saved);
  }, [slug]);

  function handleReset() {
    setCode(starterCode);
    clearSavedCode(slug);
  }
  const [bottomTab, setBottomTab] = useState<"testcase" | "result">("testcase");

  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [sampleRun, setSampleRun] = useState<SampleRunResult | null>(null);
  const [selectedResultCase, setSelectedResultCase] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleRun() {
    if (samples.length === 0) return;
    setRunning(true);
    setRunError(null);
    try {
      const cases = await Promise.all(
        samples.map(async (s, i) => {
          const inputs = Object.fromEntries(s.files.map((f) => [f.name, f.content]));
          const res = await runSolution(slug, code, inputs);
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
      // Jump straight to the first failing case, since that's the one
      // worth looking at — default to the first case if everything passed.
      const firstFailure = cases.findIndex((c) => !c.passed);
      setSelectedResultCase(firstFailure === -1 ? 0 : firstFailure);
      setBottomTab("result");
    } catch {
      setRunError("Run failed — is the backend running?");
      setBottomTab("result");
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
      recordSubmission(slug, res.verdict, Date.now(), res.submission_id);
      onSubmitResult(res);
    } catch {
      setSubmitError("Submission failed — is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResizablePanelGroup orientation="vertical">
      <ResizablePanel defaultSize="65" minSize="30" className="flex flex-col">
        <div className="flex h-10 shrink-0 items-center justify-between border-b bg-card px-3">
          <span className="text-xs text-muted-foreground">bash</span>
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label="Reset to starter code"
                    disabled={running || submitting}
                  />
                }
              >
                <RotateCcw className="size-3.5" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogTitle>Reset to starter code?</AlertDialogTitle>
                <AlertDialogDescription>
                  This discards your current code in the editor and can&apos;t be undone.
                </AlertDialogDescription>
                <AlertDialogFooter>
                  <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
                  <AlertDialogClose render={<Button variant="destructive" onClick={handleReset} />}>
                    Reset
                  </AlertDialogClose>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
            onChange={(value) => {
              const next = value ?? "";
              setCode(next);
              saveCode(slug, next);
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              // This is a practice site — Monaco has no real bash
              // language service behind "shell" anyway, so any
              // autocomplete it offers is just generic word-matching
              // from the buffer, not actually correct bash. Suggesting
              // it would both mislead and undercut the point of typing
              // it out from memory.
              quickSuggestions: false,
              suggestOnTriggerCharacters: false,
              wordBasedSuggestions: "off",
              parameterHints: { enabled: false },
              hover: { enabled: "off" },
              snippetSuggestions: "none",
              tabCompletion: "off",
            }}
          />
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize="35" minSize="15">
        <Tabs
          value={bottomTab}
          onValueChange={(v) => setBottomTab(v as "testcase" | "result")}
          className="flex h-full flex-col gap-0"
        >
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
                    {samples[selectedCase]?.description ? (
                      <article className="text-xs leading-5 text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5">
                        <ReactMarkdown>{samples[selectedCase].description}</ReactMarkdown>
                      </article>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {samples[selectedCase]?.files.map((f) => (
                          <div key={f.name}>
                            <p className="mb-1 text-xs font-medium text-muted-foreground">
                              {f.name}
                            </p>
                            <pre className="max-h-56 overflow-y-auto overflow-x-auto rounded border bg-muted p-2 font-mono text-xs whitespace-pre-wrap">
                              {f.content}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
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
                    <div className="flex flex-wrap gap-3">
                      {sampleRun.cases.map((c, i) => {
                        const selected = selectedResultCase === i;
                        const passedColors = selected
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400";
                        const failedColors = selected
                          ? "border-rose-500 bg-rose-500 text-white"
                          : "border-rose-500/50 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400";
                        return (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => setSelectedResultCase(i)}
                            className={`rounded-full border px-4 py-2 text-xs transition-colors ${
                              c.passed ? passedColors : failedColors
                            }`}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                    {sampleRun.cases[selectedResultCase] && (
                      <div className="flex flex-col gap-3">
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            Expected
                          </p>
                          <pre className="max-h-56 overflow-y-auto overflow-x-auto rounded border bg-muted p-2 font-mono text-xs whitespace-pre-wrap">
                            {sampleRun.cases[selectedResultCase].expected}
                          </pre>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            Your Output
                          </p>
                          <pre className="max-h-56 overflow-y-auto overflow-x-auto rounded border bg-muted p-2 font-mono text-xs whitespace-pre-wrap">
                            {sampleRun.cases[selectedResultCase].actual}
                          </pre>
                        </div>
                      </div>
                    )}
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
