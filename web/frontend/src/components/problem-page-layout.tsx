"use client";

import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ProblemWorkspace } from "@/components/problem-workspace";
import { ProblemDescription } from "@/components/problem-description";
import { ProblemSubmissions } from "@/components/problem-submissions";
import { useMediaQuery } from "@/hooks/use-media-query";
import { type ProblemDetail } from "@/lib/api";

function SolutionPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-16 text-center text-sm text-muted-foreground">
      <p>
        Solutions aren&apos;t revealed yet — still deciding the right gating (always
        visible? only after you solve it?) before building this for real.
      </p>
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
        Soon
      </span>
    </div>
  );
}

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

  if (isDesktop) {
    return (
      <main className="h-[calc(100vh-5rem)] overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize={42} minSize={25} className="flex flex-col">
            <Tabs defaultValue="description" className="flex h-full flex-col gap-0">
              <ProblemTabsList />
              <TabsContent value="description" className="min-h-0 flex-1">
                <ScrollArea className="h-full">
                  <ProblemDescription problem={problem} />
                </ScrollArea>
              </TabsContent>
              <TabsContent value="submissions" className="min-h-0 flex-1">
                <ScrollArea className="h-full">
                  <ProblemSubmissions slug={problem.slug} />
                </ScrollArea>
              </TabsContent>
              <TabsContent value="solution" className="min-h-0 flex-1">
                <ScrollArea className="h-full">
                  <SolutionPlaceholder />
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
          <ResizablePanel defaultSize={58} minSize={30}>
            <ProblemWorkspace slug={problem.slug} starterCode={problem.starter_code} samples={problem.samples} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    );
  }

  return (
    <main className="flex flex-col">
      <Tabs defaultValue="description" className="flex flex-col gap-0">
        <ProblemTabsList />
        <TabsContent value="description">
          <ProblemDescription problem={problem} />
        </TabsContent>
        <TabsContent value="submissions">
          <ProblemSubmissions slug={problem.slug} />
        </TabsContent>
        <TabsContent value="solution">
          <SolutionPlaceholder />
        </TabsContent>
        <TabsContent value="discussion">
          <DiscussionPlaceholder />
        </TabsContent>
      </Tabs>
      <div className="h-[70vh] border-t">
        <ProblemWorkspace slug={problem.slug} starterCode={problem.starter_code} samples={problem.samples} />
      </div>
    </main>
  );
}
