"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUser, type AuthUser } from "@/lib/auth";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// One shared source of truth for "who is signed in," fetched once at
// the root and read by ProfileMenu (nav bar, mounted once, persists
// across client-side navigation) plus every account page. Without
// this, each consumer kept its own local copy from its own mount-time
// fetch, so an action on one page (delete account, sign out) had no
// way to update the nav bar's already-mounted state — it kept showing
// the stale signed-in avatar until a manual refresh.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then((u) => {
      if (cancelled) return;
      setUser(u);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <AuthContext.Provider value={{ user, loading, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
