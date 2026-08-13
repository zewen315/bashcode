"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  fetchNotificationsPage,
  markRead,
  markAllRead,
  removeNotification,
  type Notification,
} from "@/lib/notifications";
import { relativeTime } from "@/lib/relative-time";

type Page = { items: Notification[]; nextCursor: number | null };

export default function NotificationsPage() {
  const { user } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  // Lazy initializer, not a render-time call — Date.now() is impure
  // and can't be called directly in the render body.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchNotificationsPage().then((page) => {
      if (cancelled) return;
      setPages([{ items: page?.notifications ?? [], nextCursor: page?.next_cursor ?? null }]);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // /notifications is exempt from AccountLayout's redirect-away guard
  // (see PUBLIC_ACCOUNT_ROUTES in app/(account)/layout.tsx) — a
  // signed-out visitor lands here and sees this, not a bounce to
  // /problems.
  if (!user) {
    return (
      <>
        <h1 className="mb-6 text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Sign in to see your notifications.</p>
      </>
    );
  }

  if (!loaded) return null;

  const current = pages[pageIndex];
  const items = current?.items ?? [];
  const hasNext = current?.nextCursor !== null && current?.nextCursor !== undefined;
  const hasPrevious = pageIndex > 0;

  function patchItem(id: string, patch: Partial<Notification>) {
    setPages((prev) =>
      prev.map((p) => ({ ...p, items: p.items.map((n) => (n.id === id ? { ...n, ...patch } : n)) })),
    );
  }

  async function handleMarkRead(id: string) {
    patchItem(id, { read: true });
    await markRead(id);
  }

  async function handleMarkAllRead() {
    setPages((prev) => prev.map((p) => ({ ...p, items: p.items.map((n) => ({ ...n, read: true })) })));
    await markAllRead();
  }

  async function handleRemove(id: string) {
    setPages((prev) => prev.map((p) => ({ ...p, items: p.items.filter((n) => n.id !== id) })));
    await removeNotification(id);
  }

  async function handleNext() {
    if (!current || !hasNext) return;
    if (pages[pageIndex + 1]) {
      setPageIndex((i) => i + 1);
      return;
    }
    setLoadingPage(true);
    try {
      const page = await fetchNotificationsPage(current.nextCursor ?? undefined);
      setPages((prev) => [
        ...prev,
        { items: page?.notifications ?? [], nextCursor: page?.next_cursor ?? null },
      ]);
      setPageIndex((i) => i + 1);
    } finally {
      setLoadingPage(false);
    }
  }

  function handlePrevious() {
    setPageIndex((i) => Math.max(0, i - 1));
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
          Mark all as read
        </Button>
      </div>

      {pageIndex === 0 && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notifications yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            {items.map((n) => {
              const content = (
                <>
                  <div className="flex w-full items-center gap-1.5">
                    {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                    <span className="text-sm font-medium">{n.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {relativeTime(new Date(n.created_at).getTime(), now)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                </>
              );
              return (
                <div key={n.id} className="flex items-center gap-2 rounded-md border pr-2">
                  {n.link ? (
                    <Link
                      href={n.link}
                      onClick={() => !n.read && handleMarkRead(n.id)}
                      className="flex min-w-0 flex-1 flex-col gap-0.5 px-4 py-3 text-left"
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      onClick={() => !n.read && handleMarkRead(n.id)}
                      disabled={n.read}
                      className="flex min-w-0 flex-1 flex-col gap-0.5 px-4 py-3 text-left disabled:cursor-default"
                    >
                      {content}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(n.id)}
                    aria-label="Remove notification"
                    className="shrink-0 rounded p-1 text-muted-foreground/50 hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {(hasPrevious || hasNext) && (
            <div className="flex items-center justify-between gap-2 border-t pt-4">
              <span className="text-xs text-muted-foreground">Page {pageIndex + 1}</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={!hasPrevious} onClick={handlePrevious}>
                  <ChevronLeft className="size-4" />
                  Prev
                </Button>
                <Button variant="outline" size="sm" disabled={!hasNext || loadingPage} onClick={handleNext}>
                  {loadingPage ? "Loading…" : "Next"}
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
