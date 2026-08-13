"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";
import { useToastManager } from "@/components/ui/toast";
import { ProfileEditor } from "@/components/profile-editor";
import { useAuth } from "@/lib/auth-context";
import { deleteAccount } from "@/lib/account";

export default function SettingsPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { add: addToast } = useToastManager();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // AccountLayout (app/(account)/layout.tsx) already guards against a
  // signed-out visitor and redirects before this ever renders.
  if (!user) return null;

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
      setUser(null);
      addToast({ title: "Account deleted" });
      router.replace("/problems");
    } catch {
      setDeleteError("Couldn't delete your account — try again.");
      setDeleting(false);
    }
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

      <section className="mb-10 flex flex-col gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">Profile</h2>
        <ProfileEditor user={user} onUserChange={setUser} />
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
        {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
      </section>
    </>
  );
}
