"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { listNotifications, markRead, markAllRead, type Notification } from "@/lib/notifications";
import { relativeTime } from "@/lib/relative-time";

const WIDGET_LIMIT = 5;

export function NotificationMenu() {
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Signed out: a direct link, not a dropdown — /notifications itself
  // renders the "sign in to see notifications" state (see
  // (account)/layout.tsx's PUBLIC_ACCOUNT_ROUTES and
  // (account)/notifications/page.tsx).
  if (!user) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="Notifications"
        render={<Link href="/notifications" />}
        nativeButton={false}
      >
        <Bell className="size-4" />
      </Button>
    );
  }

  async function handleMarkRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markRead(id);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllRead();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative size-8" aria-label="Notifications" />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {notifications.length === 0 ? (
          // DropdownMenuLabel wraps Base UI's Menu.GroupLabel, which
          // throws ("MenuGroupContext is missing") unless it has a
          // Menu.Group ancestor — a real, pre-existing crash whenever
          // a signed-in user had zero notifications, just never
          // exercised until now.
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              No notifications yet.
            </DropdownMenuLabel>
          </DropdownMenuGroup>
        ) : (
          <DropdownMenuGroup>
            {notifications.slice(0, WIDGET_LIMIT).map((n) => {
              const content = (
                <>
                  <div className="flex w-full items-center gap-1.5">
                    {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                    <span className="font-medium">{n.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {relativeTime(new Date(n.created_at).getTime(), now)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </>
              );
              const className = "flex-col items-start gap-0.5 whitespace-normal";
              return n.link ? (
                <DropdownMenuLinkItem
                  key={n.id}
                  render={<Link href={n.link} />}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                  className={className}
                >
                  {content}
                </DropdownMenuLinkItem>
              ) : (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                  className={className}
                >
                  {content}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        )}
        {unreadCount > 0 && (
          <DropdownMenuItem onClick={handleMarkAllRead} className="justify-center text-xs">
            Mark all as read
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLinkItem render={<Link href="/notifications" />} className="justify-center text-xs">
          View all notifications
        </DropdownMenuLinkItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
