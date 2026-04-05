"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Silently verifies the session in the background.
 * Children render immediately (showing their own skeleton shimmers).
 * If auth fails and refresh also fails, redirects to login.
 */
export function ShellAuthGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    void (async () => {
      await new Promise<void>((r) => queueMicrotask(r));

      const me = await fetch("/api/auth/me", { credentials: "same-origin" });

      if (!me.ok) {
        const refreshed = (
          await fetch("/api/auth/zoho/refresh", { method: "POST", credentials: "same-origin" })
        ).ok;

        if (!refreshed) {
          const next = pathname && pathname !== "/" ? pathname : "/";
          router.replace(`/login?next=${encodeURIComponent(next)}`);
        }
      }
    })();
  }, [router, pathname]);

  return <>{children}</>;
}
