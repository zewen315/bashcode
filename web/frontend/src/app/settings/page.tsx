"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";
import { Footer } from "@/components/footer";
import { getCurrentUser, initials, type AuthUser } from "@/lib/auth";
import { updateProfile, deleteAccount } from "@/lib/account";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) {
        router.replace("/problems");
        return;
      }
      setUser(u);
      setDisplayName(u.display_name ?? "");
      setLoaded(true);
    });
  }, [router]);

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile({ display_name: name });
      setUser(updated);
      setDisplayName(updated.display_name ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAvatar() {
    if (!user) return;
    setAvatarBusy(true);
    setError(null);
    try {
      const updated = await updateProfile({ use_provider_avatar: !user.avatar_url });
      setUser(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update avatar — try again.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
      router.replace("/problems");
    } catch {
      setError("Couldn't delete your account — try again.");
      setDeleting(false);
    }
  }

  if (!loaded || !user) return null;

  return (
    <>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

        <section className="mb-10 flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">Profile</h2>

          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials(user.display_name)}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm" onClick={handleToggleAvatar} disabled={avatarBusy}>
              {user.avatar_url ? "Use initials instead" : "Use my profile photo"}
            </Button>
          </div>

          <form onSubmit={handleSaveName} className="flex flex-col gap-1.5">
            <label htmlFor="display-name" className="text-sm font-medium">
              Display name
            </label>
            <div className="flex gap-2">
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
                required
              />
              <Button type="submit" disabled={saving || !displayName.trim()}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </section>

        <section className="flex flex-col gap-2 border-t pt-6">
          <h2 className="text-sm font-medium text-destructive">Danger zone</h2>
          <p className="text-sm text-muted-foreground">
            Deleting your account removes it immediately and can&apos;t be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" className="self-start" />}>
              Delete account
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your account and signs you out everywhere. This can&apos;t be undone.
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Yes, delete my account"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </main>
      <Footer />
    </>
  );
}
