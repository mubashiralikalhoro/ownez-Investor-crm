"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  hasAuthTokens,
  isAccessTokenLikelyExpired,
  refreshZohoAccessToken,
  clearAuthTokens,
} from "@/lib/auth-storage";

type GuardStatus = "checking" | "ok" | "redirect";

export function ShellAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<GuardStatus>("checking");

  useEffect(() => {
    void (async () => {
      await new Promise<void>((r) => queueMicrotask(r));

      if (!hasAuthTokens()) {
        setStatus("redirect");
        const next = pathname && pathname !== "/" ? pathname : "/";
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      const me = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (!me.ok) {
        clearAuthTokens();
        setStatus("redirect");
        const next = pathname && pathname !== "/" ? pathname : "/";
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      if (hasAuthTokens() && isAccessTokenLikelyExpired()) {
        await refreshZohoAccessToken();
      }

      if (!hasAuthTokens()) {
        setStatus("redirect");
        const next = pathname && pathname !== "/" ? pathname : "/";
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
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
