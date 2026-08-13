import { MessagesSquare } from "lucide-react";
import { Footer } from "@/components/footer";
import { DiscussionsFeed } from "@/components/discussions-feed";

export default function DiscussionsPage() {
  return (
    <>
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-8 flex flex-col items-center gap-2 border-b pb-8 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessagesSquare className="size-5" />
          </div>
          <h1 className="text-2xl font-semibold">Discussions</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Recent activity across every problem&apos;s discussion thread — approaches, questions,
            and everything in between.
          </p>
        </div>

        <DiscussionsFeed />
      </main>
      <Footer />
    </>
  );
}
