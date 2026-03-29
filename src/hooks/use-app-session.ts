"use client";

import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/types";

export type AppSessionClient = {
  userId: string;
  email: string | null;
  fullName: string;
  role: UserRole;
};

/**
 * Verified session from GET /api/auth/me (JWT). Use for client-only UI; RSC should use getSession().
 */
export function useAppSession(): {
  session: AppSessionClient | null;
  loading: boolean;
} {
  const [session, setSession] = useState<AppSessionClient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (cancelled) return;
        if (!res.ok) {
          setSession(null);
          return;
        }
        const j = (await res.json()) as {
          userId: string;
          email: string | null;
          fullName: string;
          role: UserRole;
        };
        setSession({
          userId: j.userId,
          email: j.email,
          fullName: j.fullName,
          role: j.role,
        });
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { session, loading };
}
