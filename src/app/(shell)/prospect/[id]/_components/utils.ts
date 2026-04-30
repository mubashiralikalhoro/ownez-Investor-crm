"use client";

import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import { getAppUserProfile } from "@/lib/auth-storage";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export function getCurrentUserRef(): { id: string; name: string } | null {
  const u = getAppUserProfile();
  if (u?.id && u.full_name) return { id: u.id, name: u.full_name };
  return null;
}

// ─── Shared API helper ────────────────────────────────────────────────────────

export async function makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const doFetch = () =>
    fetch(url, { ...options, credentials: "same-origin" });

  let res = await doFetch();
  if (res.status === 401) {
    const ok = (await fetch("/api/auth/zoho/refresh", { method: "POST", credentials: "same-origin" })).ok;
    if (!ok) throw new Error("Session expired. Please log in again.");
    res = await doFetch();
  }
  return res;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatFieldValue(value: unknown, type: string): string | null {
  if (value === null || value === undefined || value === "" || value === "-None-") return null;
  switch (type) {
    case "currency":     return typeof value === "number" ? formatCurrency(value) : null;
    case "integer_days": return typeof value === "number" ? `${value}d` : null;
    case "date":
    case "datetime":     return formatDate(value as string);
    case "owner":
    case "lookup":       return (value as { name: string }).name ?? null;
    case "boolean":      return (value as boolean) ? "Yes" : "No";
    default:             return String(value);
  }
}

export function formatAuditedTime(iso: string): string {
  const d = new Date(iso);
  const timePart = d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
  return `${formatDate(iso)} ${formatTime(timePart)}`;
}
