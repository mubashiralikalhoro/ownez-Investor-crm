"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath   = searchParams.get("next") || "/";
  const oauthError = searchParams.get("error");
  const oauthUserId    = searchParams.get("user_id");
  const oauthUserEmail = searchParams.get("user_email");

  const [loading,  setLoading]  = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // If there's already a valid session cookie, skip login.
    void fetch("/api/auth/me", { credentials: "same-origin" }).then((res) => {
      if (res.ok) {
        router.replace(nextPath.startsWith("/") ? nextPath : "/");
      } else {
        setChecking(false);
      }
    });
  }, [router, nextPath]);

  function handleLoginWithZoho() {
    setLoading(true);
    const safeNext = nextPath.startsWith("/") ? nextPath : "/";
    const start = `/api/auth/zoho/start?next=${encodeURIComponent(safeNext)}`;
    window.location.assign(start);
  }

  if (checking) {
    return (
      <div className="flex min-h-[120px] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-navy/10 border-t-gold"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {oauthError ? (
        <div className="rounded-lg border border-alert-red/25 bg-alert-red-light px-3 py-2 text-center text-xs text-alert-red space-y-1">
          <p>
            {(() => {
              try {
                return decodeURIComponent(oauthError.replace(/\+/g, " "));
              } catch {
                return oauthError;
              }
            })()}
          </p>
          {oauthUserId ? (
            <p className="font-mono text-[11px] text-alert-red/80">
              User ID: {oauthUserId}
              {oauthUserEmail ? ` (${oauthUserEmail})` : ""}
            </p>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        onClick={handleLoginWithZoho}
        disabled={loading}
        aria-label="Log in with Zoho"
        className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-navy/[0.1] bg-white py-3.5 pl-5 pr-6 text-[15px] font-semibold text-navy shadow-[0_2px_12px_rgba(11,32,73,0.07)] transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/45 hover:shadow-[0_8px_24px_rgba(11,32,73,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
      >
        <span
          className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-gold via-gold to-gold-hover"
          aria-hidden
        />
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fafbfc] ring-1 ring-navy/[0.06] transition-colors group-hover:bg-gold-light/40 group-hover:ring-gold/25">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-navy/70" aria-hidden />
          ) : (
            <Image
              src="/zoho-icon.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
          )}
        </span>
        <span className="min-w-0 flex-1 text-left leading-snug">
          {loading ? (
            <span className="block text-[15px] font-semibold text-navy/80">
              Redirecting to Zoho…
            </span>
          ) : (
            <span className="block text-[15px] font-semibold tracking-tight">
              Login with Zoho
            </span>
          )}
        </span>
      </button>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[120px] items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-navy/10 border-t-gold"
            aria-hidden
          />
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
