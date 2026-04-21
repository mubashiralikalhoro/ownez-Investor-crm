"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAppUserProfile } from "@/lib/auth-storage";
import type { UserRole } from "@/lib/types";

function ZohoCallbackInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    const desc  = searchParams.get("error_description");
    const code  = searchParams.get("code");
    const state = searchParams.get("state");

    if (error) {
      router.replace(`/login?error=${encodeURIComponent(desc || error)}`);
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
          method:      "POST",
          headers:     { "Content-Type": "application/json" },
          body:        JSON.stringify({ code, state }),
          credentials: "same-origin",
        });

        const data = (await res.json()) as {
          error?:             string;
          error_description?: string;
          user_id?:           string | null;
          user_email?:        string | null;
          app_user?: {
            id:                string;
            email:             string | null;
            full_name:         string;
            role:              UserRole;
            zoho_role_id?:     string | null;
            zoho_role_name?:   string | null;
            zoho_profile_name?: string | null;
          };
          next?: string;
        };

        if (cancelled) return;

        if (!res.ok) {
          const idParam    = data.user_id    ? `&user_id=${encodeURIComponent(data.user_id)}`       : "";
          const emailParam = data.user_email ? `&user_email=${encodeURIComponent(data.user_email)}` : "";
          if (res.status === 403 && data.error === "role_not_allowed") {
            router.replace(
              `/login?error=${encodeURIComponent(data.error_description ?? "Your Zoho role is not allowed.")}${idParam}${emailParam}`
            );
          } else if (res.status === 403 && (data.error === "not_authorized" || data.error === "access_revoked")) {
            router.replace(
              `/login?error=${encodeURIComponent(data.error_description ?? data.error)}${idParam}${emailParam}`
            );
          } else {
            router.replace(
              `/login?error=${encodeURIComponent(data.error || "token_exchange_failed")}`
            );
          }
          return;
        }

        // Store the user profile in localStorage for display purposes only.
        // The actual auth tokens are in httpOnly cookies (set by the server above).
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
