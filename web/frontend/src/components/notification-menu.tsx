"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { listNotifications, markRead, markAllRead, type Notification } from "@/lib/notifications";
import { relativeTime } from "@/lib/relative-time";

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

  // Signed out but state still holds a previous fetch (e.g. right
  // after the user just signed out) — never display stale data.
  const visibleNotifications = user ? notifications : [];
  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  async function handleMarkRead(id: number) {
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
        {!user ? (
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Sign in to see notifications.
          </DropdownMenuLabel>
        ) : visibleNotifications.length === 0 ? (
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            No notifications yet.
          </DropdownMenuLabel>
        ) : (
          <>
            <DropdownMenuGroup>
              {visibleNotifications.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                  className="flex-col items-start gap-0.5 whitespace-normal"
                >
                  <div className="flex w-full items-center gap-1.5">
                    {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                    <span className="font-medium">{n.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {relativeTime(new Date(n.created_at).getTime(), now)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            {unreadCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleMarkAllRead} className="justify-center text-xs">
                  Mark all as read
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
