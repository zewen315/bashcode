import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { getProblem } from "@/lib/api";
import { difficultyColor } from "@/lib/difficulty";
import { ProblemWorkspace } from "@/components/problem-workspace";

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const problem = await getProblem(slug).catch(() => null);
  if (!problem) notFound();

  return (
    <main className="h-[calc(100vh-5rem)] overflow-hidden">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={42} minSize={25} className="flex flex-col">
          <Tabs defaultValue="description" className="flex h-full flex-col gap-0">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-3">
              <TabsTrigger value="description">Description</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="min-h-0 flex-1">
              <ScrollArea className="h-full">
                <div className="px-5 py-4">
                  <div className="mb-3 flex items-center gap-2">
                    <h1 className="text-lg font-semibold">{problem.title}</h1>
                    <Badge variant="outline" className={difficultyColor(problem.difficulty)}>
                      {problem.difficulty}
                    </Badge>
                  </div>
                  <article className="text-sm leading-6 text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_h1]:hidden [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_p]:mb-4 [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5">
                    <ReactMarkdown>{problem.description}</ReactMarkdown>
                  </article>
                </div>
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
