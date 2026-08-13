"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";
import { ProfileEditor, type ProfileEditorHandle } from "@/components/profile-editor";
import { useAuth } from "@/lib/auth-context";

export default function WelcomePage() {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();
  const editorRef = useRef<ProfileEditorHandle>(null);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/problems");
  }, [loading, user, router]);

  if (loading || !user) return null;

  // Skipping never saves anything, whether or not something was
  // typed — only "Continue" applies a draft name, and only if one
  // was actually entered. Neither button shows a separate "Save"
  // step anymore.
  async function handleContinue() {
    setContinuing(true);
    try {
      if (editorRef.current?.hasNameDraft()) {
        await editorRef.current.saveName().catch(() => {});
      }
      router.push("/problems");
    } finally {
      setContinuing(false);
    }
  }

  return (
    <>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-1 text-2xl font-semibold">Welcome to BashCode</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Want to set a photo or display name before you dive in? You can always change these later from Settings.
        </p>

        <ProfileEditor user={user} onUserChange={setUser} ref={editorRef} showSaveButton={false} />

        <div className="mt-8 flex items-center gap-4">
          <Button onClick={handleContinue} disabled={continuing}>
            {continuing ? "Continuing…" : "Continue"}
          </Button>
          <Link href="/problems" className="text-sm text-muted-foreground underline">
            Skip for now
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
