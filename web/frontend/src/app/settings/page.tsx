"use client";

import { useEffect, useState } from "react";
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
import { Footer } from "@/components/footer";
import { ProfileEditor } from "@/components/profile-editor";
import { getCurrentUser, type AuthUser } from "@/lib/auth";
import { deleteAccount } from "@/lib/account";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) {
        router.replace("/problems");
        return;
      }
      setUser(u);
      setLoaded(true);
    });
  }, [router]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
      router.replace("/problems");
    } catch {
      setDeleteError("Couldn't delete your account — try again.");
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
      </main>
      <Footer />
    </>
  );
}
