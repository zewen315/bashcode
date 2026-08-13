"use client";

import { useState } from "react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ProblemWorkspace } from "@/components/problem-workspace";
import { ProblemDescription } from "@/components/problem-description";
import { ProblemSubmissions } from "@/components/problem-submissions";
import { ProblemSolution } from "@/components/problem-solution";
import { useMediaQuery } from "@/hooks/use-media-query";
import { type ProblemDetail, type SubmitResult } from "@/lib/api";

type LeftTab = "description" | "submissions" | "solution" | "discussion";

function DiscussionPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-16 text-center text-sm text-muted-foreground">
      <p>Per-problem discussion threads aren&apos;t built yet.</p>
      <Link href="/discussions" className="text-xs text-foreground underline">
        See the general Discussions page
      </Link>
    </div>
  );
}

function ProblemTabsList() {
  return (
    <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-3">
      <TabsTrigger value="description">Description</TabsTrigger>
      <TabsTrigger value="submissions">Submissions</TabsTrigger>
      <TabsTrigger value="solution">Solution</TabsTrigger>
      <TabsTrigger value="discussion">Discussion</TabsTrigger>
    </TabsList>
  );
}

// Rendered exactly once regardless of layout — the split-pane (desktop)
// and stacked (mobile) arrangements both wrap this same single mounted
// ProblemWorkspace instance rather than each rendering their own copy.
// Two mounted editors would desync (typing in one wouldn't update the
// other) if the layout ever switched underneath the user.
export function ProblemPageLayout({ problem }: { problem: ProblemDetail }) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Owned here, not inside ProblemWorkspace, so that clicking Submit
  // (which happens in the right-hand workspace) can switch the LEFT
  // panel to its Submissions tab and hand it the result to display.
  const [leftTab, setLeftTab] = useState<LeftTab>("description");
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  function handleSubmitResult(res: SubmitResult) {
    setSubmitResult(res);
    setLeftTab("submissions");
  }

  if (isDesktop) {
    return (
      <main className="h-[calc(100vh-5rem)] overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize="42" minSize="25" className="flex flex-col">
            <Tabs
              value={leftTab}
              onValueChange={(v) => setLeftTab(v as LeftTab)}
              className="flex h-full flex-col gap-0"
            >
              <ProblemTabsList />
              <TabsContent value="description" className="min-h-0 flex-1">
                <ScrollArea className="h-full">
                  <ProblemDescription problem={problem} />
                </ScrollArea>
              </TabsContent>
              <TabsContent value="submissions" className="min-h-0 flex-1">
                <ScrollArea className="h-full">
                  <ProblemSubmissions slug={problem.slug} liveResult={submitResult} />
                </ScrollArea>
              </TabsContent>
              <TabsContent value="solution" className="min-h-0 flex-1">
                <ScrollArea className="h-full">
                  <ProblemSolution problem={problem} />
                </ScrollArea>
              </TabsContent>
              <TabsContent value="discussion" className="min-h-0 flex-1">
                <ScrollArea className="h-full">
                  <DiscussionPlaceholder />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="58" minSize="30">
            <ProblemWorkspace
              slug={problem.slug}
              starterCode={problem.starter_code}
              samples={problem.samples}
              onSubmitResult={handleSubmitResult}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    );
  }

  return (
    <main className="flex flex-col">
      <Tabs
        value={leftTab}
        onValueChange={(v) => setLeftTab(v as LeftTab)}
        className="flex flex-col gap-0"
      >
        <ProblemTabsList />
        <TabsContent value="description">
          <ProblemDescription problem={problem} />
        </TabsContent>
        <TabsContent value="submissions">
          <ProblemSubmissions slug={problem.slug} liveResult={submitResult} />
        </TabsContent>
        <TabsContent value="solution">
          <ProblemSolution problem={problem} />
        </TabsContent>
        <TabsContent value="discussion">
          <DiscussionPlaceholder />
        </TabsContent>
      </Tabs>
      <div className="h-[70vh] border-t">
        <ProblemWorkspace
          slug={problem.slug}
          starterCode={problem.starter_code}
          samples={problem.samples}
          onSubmitResult={handleSubmitResult}
        />
      </div>
    </main>
  );
}
