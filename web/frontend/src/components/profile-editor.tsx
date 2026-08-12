"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastManager } from "@/components/ui/toast";
import { initials, type AuthUser } from "@/lib/auth";
import { updateProfile, uploadAvatar } from "@/lib/account";

const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ProfileEditor({
  user,
  onUserChange,
}: {
  user: AuthUser;
  onUserChange: (user: AuthUser) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { add: addToast } = useToastManager();
  const [displayName, setDisplayName] = useState(user.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile({ display_name: name });
      onUserChange(updated);
      setDisplayName(updated.display_name ?? "");
      addToast({ title: "Display name saved" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  function handlePickFile() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
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
      onUserChange(updated);
      addToast({ title: "Photo updated" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload — try again.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleUseProviderAvatar() {
    setAvatarBusy(true);
    setError(null);
    try {
      const updated = await updateProfile({ use_provider_avatar: true });
      onUserChange(updated);
      addToast({ title: "Photo updated" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update avatar — try again.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarBusy(true);
    setError(null);
    try {
      const updated = await updateProfile({ use_provider_avatar: false });
      onUserChange(updated);
      addToast({ title: "Photo removed" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update avatar — try again.");
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
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
    </div>
  );
}
