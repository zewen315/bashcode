"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { listNotifications, markRead, markAllRead, type Notification } from "@/lib/notifications";
import { relativeTime } from "@/lib/relative-time";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // Lazy initializer, not a render-time call — Date.now() is impure
  // and can't be called directly in the render body.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listNotifications().then((data) => {
      if (!cancelled) setNotifications(data);
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleMarkRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markRead(id);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllRead();
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notifications yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {notifications.map((n) => {
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
            return n.link ? (
              <Link
                key={n.id}
                href={n.link}
                onClick={() => !n.read && handleMarkRead(n.id)}
                className="flex flex-col gap-0.5 rounded-md border px-4 py-3 text-left"
              >
                {content}
              </Link>
            ) : (
              <button
                key={n.id}
                onClick={() => !n.read && handleMarkRead(n.id)}
                disabled={n.read}
                className="flex flex-col gap-0.5 rounded-md border px-4 py-3 text-left disabled:cursor-default"
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
