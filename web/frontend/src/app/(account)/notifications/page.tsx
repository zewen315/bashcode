"use client";

import { useEffect, useState } from "react";
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

  // AccountLayout (app/(account)/layout.tsx) already guards against a
  // signed-out visitor and redirects before this ever renders.
  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleMarkRead(id: number) {
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
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.read && handleMarkRead(n.id)}
              disabled={n.read}
              className="flex flex-col gap-0.5 rounded-md border px-4 py-3 text-left disabled:cursor-default"
            >
              <div className="flex w-full items-center gap-1.5">
                {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                <span className="text-sm font-medium">{n.title}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {relativeTime(new Date(n.created_at).getTime(), now)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{n.body}</p>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
