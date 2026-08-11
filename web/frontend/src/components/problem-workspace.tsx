"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { submitSolution, type SubmitResult } from "@/lib/api";

const VERDICT_VARIANT: Record<SubmitResult["verdict"], "secondary" | "destructive"> = {
  Accepted: "secondary",
  "Wrong Answer": "destructive",
  Timeout: "destructive",
  "No Tests Found": "destructive",
};

export function ProblemWorkspace({
  slug,
  starterCode,
}: {
  slug: string;
  starterCode: string;
}) {
  const [code, setCode] = useState(starterCode);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      setResult(await submitSolution(slug, code));
    } catch {
      setError("Submission failed — is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-md border">
        <Editor
          height="400px"
          defaultLanguage="shell"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value ?? "")}
          options={{ minimap: { enabled: false }, fontSize: 13 }}
        />
      </div>

      <Button onClick={handleSubmit} disabled={submitting} className="self-start">
        {submitting ? "Running…" : "Submit"}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="flex flex-col gap-3 rounded-md border p-4">
          <div className="flex items-center gap-2">
            <Badge variant={VERDICT_VARIANT[result.verdict]}>{result.verdict}</Badge>
            <span className="text-xs text-muted-foreground">
              {result.elapsed_seconds.toFixed(2)}s
            </span>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            {result.tests.map((t) => (
              <div key={t.name} className="rounded border p-2 font-mono text-xs">
                <span className={t.passed ? "text-green-600" : "text-destructive"}>
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
  );
}
