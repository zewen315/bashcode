"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
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
import { resetCodingHistory } from "@/lib/local-progress";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { add: addToast } = useToastManager();
  const { theme, setTheme } = useTheme();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // AccountLayout (app/(account)/layout.tsx) already guards against a
  // signed-out visitor and redirects before this ever renders — so,
  // unlike the nav-bar's always-rendered ThemeToggle, everything below
  // this point only ever renders after the client has already
  // hydrated (the server/first-paint output is always null, gated by
  // the check above), which means there's no hydration mismatch risk
  // here and no need for ThemeToggle's extra `mounted` guard.
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

  function handleResetHistory() {
    resetCodingHistory();
    addToast({ title: "Coding history reset" });
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

      <section className="mb-10 flex flex-col gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">Profile</h2>
        <ProfileEditor user={user} onUserChange={setUser} />
      </section>

      <section className="mb-10 flex flex-col gap-3 border-t pt-6">
        <h2 className="text-sm font-medium text-muted-foreground">Appearance</h2>
        <div className="flex gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant="outline"
              size="sm"
              onClick={() => setTheme(value)}
              className={cn(theme === value && "border-primary bg-muted")}
            >
              <Icon className="size-4" />
              {label}
            </Button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t pt-6">
        <h2 className="text-sm font-medium text-destructive">Danger zone</h2>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Reset your solved problems, attempted problems, and recent activity. Starred problems aren&apos;t
            affected. This can&apos;t be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" className="self-start" />}>
              Reset coding history
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Reset your coding history?</AlertDialogTitle>
              <AlertDialogDescription>
                This clears your solved problems, attempted problems, and recent activity in this browser.
                Starred problems aren&apos;t affected. This can&apos;t be undone.
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
                <AlertDialogClose render={<Button variant="destructive" onClick={handleResetHistory} />}>
                  Yes, reset my history
                </AlertDialogClose>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="flex flex-col gap-2">
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
        </div>
      </section>
    </>
  );
}
