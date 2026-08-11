"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ProblemWorkspace } from "@/components/problem-workspace";
import { ProblemDescription } from "@/components/problem-description";
import { useMediaQuery } from "@/hooks/use-media-query";
import { type ProblemDetail } from "@/lib/api";

// Rendered exactly once regardless of layout — the split-pane (desktop)
// and stacked (mobile) arrangements both wrap this same single mounted
// ProblemWorkspace instance rather than each rendering their own copy.
// Two mounted editors would desync (typing in one wouldn't update the
// other) if the layout ever switched underneath the user.
export function ProblemPageLayout({ problem }: { problem: ProblemDetail }) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (isDesktop) {
    return (
      <main className="h-[calc(100vh-3rem)] overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize={42} minSize={25} className="flex flex-col">
            <Tabs defaultValue="description" className="flex h-full flex-col gap-0">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-3">
                <TabsTrigger value="description">Description</TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="min-h-0 flex-1">
                <ScrollArea className="h-full">
                  <ProblemDescription problem={problem} />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={58} minSize={30}>
            <ProblemWorkspace slug={problem.slug} starterCode={problem.starter_code} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    );
  }

  return (
    <main className="flex flex-col">
      <ProblemDescription problem={problem} />
      <div className="h-[70vh] border-t">
        <ProblemWorkspace slug={problem.slug} starterCode={problem.starter_code} />
      </div>
    </main>
  );
}
