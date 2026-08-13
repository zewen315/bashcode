"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { Footer } from "@/components/footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/auth";
import { relativeTime } from "@/lib/relative-time";
import { fetchDiscussionsFeed, type DiscussionFeedItem } from "@/lib/comments-api";

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
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
        <div>
          <h1 className="text-lg font-semibold">Discussions</h1>
          <p className="text-sm text-muted-foreground">
            Recent activity across every problem&apos;s discussion thread.
          </p>
        </div>

        {!loaded ? null : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No discussions yet — be the first to start one from a problem page.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/problems/${item.slug}?tab=discussion`}
                className="flex flex-col gap-2 rounded-lg border p-4 hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarImage src={item.author.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {initials(item.author.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{item.author.display_name ?? "user"}</span>
                  <span className="text-xs text-muted-foreground">
                    on {item.problem_title ?? item.slug}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {relativeTime(item.created_at, now)}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                </div>
              </Link>
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
