"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAppUserProfile, setZohoAuthSession } from "@/lib/auth-storage";
import type { UserRole } from "@/lib/types";

function ZohoCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    const desc = searchParams.get("error_description");
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (error) {
      const q = new URLSearchParams({
        error: desc || error,
      });
      router.replace(`/login?${q.toString()}`);
      return;
    }

    if (!code || !state) {
      router.replace("/login?error=missing_oauth_params");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/zoho/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, state }),
          credentials: "same-origin",
        });

        const data = (await res.json()) as {
          error?: string;
          error_description?: string;
          access_token?: string;
          refresh_token?: string;
          api_domain?: string;
          expires_at_ms?: number;
          user?: { id: string; full_name?: string; email?: string } | null;
          app_user?: {
            id: string;
            email: string | null;
            full_name: string;
            role: UserRole;
            zoho_role_id?: string | null;
            zoho_role_name?: string | null;
            zoho_profile_name?: string | null;
          };
          next?: string;
        };

        if (cancelled) return;

        if (!res.ok) {
          if (res.status === 403 && data.error === "role_not_allowed") {
            router.replace(
              `/login?error=${encodeURIComponent(data.error_description ?? "Your Zoho role is not allowed to access this app.")}`
            );
          } else {
            router.replace(
              `/login?error=${encodeURIComponent(data.error || "token_exchange_failed")}`
            );
          }
          return;
        }

        if (!data.access_token || !data.refresh_token || !data.api_domain) {
          router.replace("/login?error=incomplete_token_response");
          return;
        }

        setZohoAuthSession({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          apiDomain: data.api_domain,
          expiresAtMs: data.expires_at_ms ?? Date.now() + 3600_000,
          user: data.user ?? null,
        });

        if (data.app_user) {
          setAppUserProfile(data.app_user);
        }

        const next = data.next?.startsWith("/") ? data.next : "/";
        router.replace(next);
        router.refresh();
      } catch {
        if (!cancelled) router.replace("/login?error=callback_failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] px-4">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-navy/10 border-t-gold"
        aria-hidden
      />
      <p className="mt-4 text-sm text-muted-foreground">Completing sign in…</p>
    </div>
  );
}

export function ZohoCallbackClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa]">
          <div
            className="h-9 w-9 animate-spin rounded-full border-2 border-navy/10 border-t-gold"
            aria-hidden
          />
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <ZohoCallbackInner />
    </Suspense>
  );
}
