"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import ReactMarkdown from "react-markdown";
import { commands } from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

// CodeMirror-adjacent internals touch `window` at import time — must
// never run during SSR (matches the ssr:false pattern this app would
// use for any browser-only editor).
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

// Curated subset of the default toolbar — this is a comment box, not
// a document editor, so headings/tables/images/hr are left out.
const TOOLBAR_COMMANDS = [
  commands.bold,
  commands.italic,
  commands.strikethrough,
  commands.divider,
  commands.link,
  commands.quote,
  commands.code,
  commands.codeBlock,
  commands.divider,
  commands.unorderedListCommand,
  commands.orderedListCommand,
  commands.checkedListCommand,
];

export function CommentComposer({
  placeholder,
  submitLabel,
  autoFocus,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  submitLabel: string;
  autoFocus?: boolean;
  onSubmit: (body: string) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const [body, setBody] = useState("");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setBody("");
      setTab("write");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2" data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "write" | "preview")}>
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="write">
          <MDEditor
            value={body}
            onChange={(v) => setBody(v ?? "")}
            preview="edit"
            height={160}
            commands={TOOLBAR_COMMANDS}
            extraCommands={[]}
            textareaProps={{ placeholder, autoFocus }}
          />
        </TabsContent>
        <TabsContent value="preview">
          <div className="min-h-24 rounded-md border px-3 py-2 text-sm">
            {body.trim() ? (
              <article className="[&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_code]:font-mono [&_code]:text-xs">
                <ReactMarkdown>{body}</ReactMarkdown>
              </article>
            ) : (
              <p className="text-muted-foreground">Nothing to preview yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button size="sm" onClick={handleSubmit} disabled={!body.trim() || submitting}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
