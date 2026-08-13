export type Notification = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
  link: string | null;
};

export type NotificationsPage = {
  notifications: Notification[];
  next_cursor: number | null;
};

export async function listNotifications(): Promise<Notification[]> {
  const res = await fetch("/api/notifications", { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as NotificationsPage;
  return data.notifications;
}

export async function fetchNotificationsPage(before?: number): Promise<NotificationsPage | null> {
  const qs = before ? `?before=${before}` : "";
  const res = await fetch(`/api/notifications${qs}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function markRead(id: string): Promise<void> {
  await fetch(`/api/notifications/${id}/read`, { method: "POST" });
}

export async function markAllRead(): Promise<void> {
  await fetch("/api/notifications/read-all", { method: "POST" });
}

export async function removeNotification(id: string): Promise<void> {
  await fetch(`/api/notifications/${id}`, { method: "DELETE" });
}
