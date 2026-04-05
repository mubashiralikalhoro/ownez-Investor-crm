"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type GuardStatus = "checking" | "ok" | "redirect";

export function ShellAuthGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<GuardStatus>("checking");

  useEffect(() => {
    void (async () => {
      // Wait one microtask so RSC hydration settles first.
      await new Promise<void>((r) => queueMicrotask(r));

      const me = await fetch("/api/auth/me", { credentials: "same-origin" });

      if (!me.ok) {
        // Try a silent token refresh before giving up.
        const refreshed = (
          await fetch("/api/auth/zoho/refresh", { method: "POST", credentials: "same-origin" })
        ).ok;

        if (!refreshed) {
          setStatus("redirect");
          const next = pathname && pathname !== "/" ? pathname : "/";
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
      }

      setStatus("ok");
    })();
  }, [router, pathname]);

  if (status !== "ok") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f6f7f9]">
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-navy/10 border-t-gold"
          aria-hidden
        />
        <p className="mt-4 text-sm text-muted-foreground">
          {status === "redirect" ? "Redirecting to sign in…" : "Checking your session…"}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
