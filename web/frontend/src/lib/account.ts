import type { AuthUser } from "@/lib/auth";

export type ProfilePatch = {
  display_name?: string;
  use_provider_avatar?: boolean;
};

export async function updateProfile(patch: ProfilePatch): Promise<AuthUser> {
  const res = await fetch("/api/account/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `update failed (${res.status})`);
  }
  const data = (await res.json()) as { user: AuthUser };
  return data.user;
}

export async function deleteAccount(): Promise<void> {
  const res = await fetch("/api/account", { method: "DELETE" });
  if (!res.ok) throw new Error(`delete failed (${res.status})`);
}
