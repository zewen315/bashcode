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

  // The dropdown preview only ever shows unread notifications — once
  // one's read (or removed on the full /notifications page) it drops
  // out of view here automatically, since this is recomputed fresh
  // from `notifications` on every render. Read history still lives on
  // the full page via "View all notifications" below.
  const unread = notifications.filter((n) => !n.read);

  // Signed out: same dropdown shell as signed in, just a "sign in"
  // prompt instead of content — no redirect on click. (Wrapped in
  // DropdownMenuGroup, not a bare DropdownMenuLabel — that throws
  // without a Menu.Group ancestor, see the comment further down where
  // this exact crash was first caught.)
  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="size-8" aria-label="Notifications" />
          }
        >
          <Bell className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Sign in to see notifications.
            </DropdownMenuLabel>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
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
        {unread.length > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]"
          >
            {unread.length > 9 ? "9+" : unread.length}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {unread.length === 0 ? (
          // DropdownMenuLabel wraps Base UI's Menu.GroupLabel, which
          // throws ("MenuGroupContext is missing") unless it has a
          // Menu.Group ancestor — a real, pre-existing crash whenever
          // a signed-in user had zero notifications, just never
          // exercised until now.
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              You&apos;re all caught up.
            </DropdownMenuLabel>
          </DropdownMenuGroup>
        ) : (
          <DropdownMenuGroup>
            {unread.slice(0, WIDGET_LIMIT).map((n) => {
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
        {unread.length > 0 && (
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
