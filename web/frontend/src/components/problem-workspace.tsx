"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { submitSolution, type SubmitResult } from "@/lib/api";
import { markSolved } from "@/lib/local-progress";

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
}: {
  slug: string;
  starterCode: string;
}) {
  const { resolvedTheme } = useTheme();
  const [code, setCode] = useState(starterCode);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitSolution(slug, code);
      setResult(res);
      if (res.verdict === "Accepted") markSolved(slug);
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
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Running…" : "Submit"}
          </Button>
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
        <Tabs defaultValue="result" className="flex h-full flex-col gap-0">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-3">
            <TabsTrigger value="result">Result</TabsTrigger>
          </TabsList>
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
