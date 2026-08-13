export type Notification = {
  id: number;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
};

export async function listNotifications(): Promise<Notification[]> {
  const res = await fetch("/api/notifications", { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { notifications: Notification[] };
  return data.notifications;
}

export async function markRead(id: number): Promise<void> {
  await fetch(`/api/notifications/${id}/read`, { method: "POST" });
}

export async function markAllRead(): Promise<void> {
  await fetch("/api/notifications/read-all", { method: "POST" });
}
