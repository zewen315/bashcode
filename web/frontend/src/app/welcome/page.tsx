"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";
import { ProfileEditor } from "@/components/profile-editor";
import { getCurrentUser, type AuthUser } from "@/lib/auth";

export default function WelcomePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loaded, setLoaded] = useState(false);

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

  if (!loaded || !user) return null;

  return (
    <>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-1 text-2xl font-semibold">Welcome to BashCode</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Want to set a photo or display name before you dive in? You can always change these later from Settings.
        </p>

        <ProfileEditor user={user} onUserChange={setUser} />

        <div className="mt-8 flex items-center gap-4">
          <Button render={<Link href="/problems" />} nativeButton={false}>
            Continue
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
