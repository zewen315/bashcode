"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, MessagesSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { Footer } from "@/components/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/auth";
import { relativeTime } from "@/lib/relative-time";
import { fetchDiscussionsFeed, type DiscussionFeedItem } from "@/lib/comments-api";

function FeedCard({ item, now }: { item: DiscussionFeedItem; now: number }) {
  return (
    <Link
      href={`/problems/${item.slug}?tab=discussion`}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
    >
      <div className="flex items-center gap-2.5">
        <Avatar size="sm">
          <AvatarImage src={item.author.avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {initials(item.author.display_name)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{item.author.display_name ?? "user"}</span>
        <Badge variant="outline" className="text-muted-foreground">
          {item.problem_title ?? item.slug}
        </Badge>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {relativeTime(item.created_at, now)}
        </span>
      </div>
      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.excerpt}</p>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ThumbsUp className="size-3.5" />
          {item.upvotes}
        </span>
        <span className="inline-flex items-center gap-1">
          <ThumbsDown className="size-3.5" />
          {item.downvotes}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="size-3.5" />
          {item.reply_count} {item.reply_count === 1 ? "reply" : "replies"}
        </span>
        <span className="ml-auto text-xs font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100">
          Open thread →
        </span>
      </div>
    </Link>
  );
}

export default function DiscussionsPage() {
  const [items, setItems] = useState<DiscussionFeedItem[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    fetchDiscussionsFeed().then((page) => {
      if (cancelled) return;
      setItems(page?.items ?? []);
      setCursor(page?.next_cursor ?? null);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLoadMore() {
    if (cursor === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchDiscussionsFeed(cursor);
      setItems((prev) => [...prev, ...(page?.items ?? [])]);
      setCursor(page?.next_cursor ?? null);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <>
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <div className="flex flex-col items-center gap-2 border-b pb-8 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessagesSquare className="size-5" />
          </div>
          <h1 className="text-2xl font-semibold">Discussions</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Recent activity across every problem&apos;s discussion thread — approaches, questions,
            and the occasional argument about <code className="rounded bg-muted px-1 py-0.5 text-foreground">awk</code> one-liners.
          </p>
        </div>

        {!loaded ? null : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <MessagesSquare className="size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No discussions yet — be the first to start one from a problem page.
            </p>
            <Button variant="outline" render={<Link href="/problems" />} nativeButton={false}>
              Browse problems
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <FeedCard key={item.id} item={item} now={now} />
            ))}
            {cursor !== null && (
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="self-center"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
