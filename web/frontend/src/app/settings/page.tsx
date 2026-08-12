"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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
import { updateProfile, deleteAccount, uploadAvatar } from "@/lib/account";

const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  function handlePickFile() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setError("That doesn't look like an image (JPEG, PNG, WebP, or GIF).");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Image is too large (max 8MB).");
      return;
    }

    setAvatarBusy(true);
    setError(null);
    try {
      const updated = await uploadAvatar(file);
      setUser(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload — try again.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleUseProviderAvatar() {
    if (!user) return;
    setAvatarBusy(true);
    setError(null);
    try {
      const updated = await updateProfile({ use_provider_avatar: true });
      setUser(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update avatar — try again.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!user) return;
    setAvatarBusy(true);
    setError(null);
    try {
      const updated = await updateProfile({ use_provider_avatar: false });
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
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_AVATAR_TYPES.join(",")}
                onChange={handleFileSelected}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={handlePickFile} disabled={avatarBusy}>
                {avatarBusy ? "Working…" : "Upload photo"}
              </Button>
              {user.provider_avatar_url && user.avatar_url !== user.provider_avatar_url && (
                <Button variant="outline" size="sm" onClick={handleUseProviderAvatar} disabled={avatarBusy}>
                  Use my profile photo
                </Button>
              )}
              {user.avatar_url && (
                <Button variant="outline" size="sm" onClick={handleRemoveAvatar} disabled={avatarBusy}>
                  Remove photo
                </Button>
              )}
            </div>
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
