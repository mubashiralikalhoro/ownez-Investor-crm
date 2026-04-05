import type { UserRole } from "@/lib/types";

/**
 * Client-side app user profile (display only).
 * Stored in localStorage for UI convenience — not used for security decisions.
 * Authoritative role/identity for security is the httpOnly cookie session (server-side).
 */

export const APP_USER_KEY = "ownez_app_user";

export type AppStoredUser = {
  id:                string;
  email:             string | null;
  full_name:         string;
  role:              UserRole;
  zoho_role_id?:     string | null;
  zoho_role_name?:   string | null;
  zoho_profile_name?: string | null;
};

export function setAppUserProfile(profile: AppStoredUser): void {
  localStorage.setItem(APP_USER_KEY, JSON.stringify(profile));
}

export function getAppUserProfile(): AppStoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(APP_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppStoredUser;
  } catch {
    return null;
  }
}

export function clearAuthTokens(): void {
  localStorage.removeItem(APP_USER_KEY);
}

/**
 * Refreshes the Zoho access token by calling the server-side refresh endpoint.
 * The server reads the httpOnly refresh cookie and sets a new access cookie.
 * Returns true if the refresh succeeded.
 */
export async function refreshZohoAccessToken(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/zoho/refresh", {
      method:      "POST",
      credentials: "same-origin",
    });
    return res.ok;
  } catch {
    return false;
  }
}
