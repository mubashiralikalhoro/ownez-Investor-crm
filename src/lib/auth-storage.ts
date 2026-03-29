import type { UserRole } from "@/lib/types";

/**
 * Client-side Zoho tokens + app user mirror (display only).
 * Authoritative role for security is the httpOnly session JWT — use GET /api/auth/me or server getSession().
 */

export const AUTH_ACCESS_TOKEN_KEY = "access_token";
export const AUTH_REFRESH_TOKEN_KEY = "refresh_token";
export const ZOHO_API_DOMAIN_KEY = "zoho_api_domain";
export const ZOHO_TOKEN_EXPIRES_AT_KEY = "zoho_token_expires_at";
export const ZOHO_USER_KEY = "zoho_user";
/** Mirror of server-issued profile at login — can be spoofed; never trust role from here for auth. */
export const APP_USER_KEY = "ownez_app_user";

export type ZohoStoredUser = {
  id: string;
  full_name?: string;
  email?: string;
};

export type AppStoredUser = {
  id: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  zoho_profile_name?: string | null;
  zoho_role_name?: string | null;
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

export function hasAuthTokens(): boolean {
  if (typeof window === "undefined") return false;
  const access = localStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
  const refresh = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
  return Boolean(access?.trim() && refresh?.trim());
}

export function setAuthTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
}

export function setZohoAuthSession(data: {
  accessToken: string;
  refreshToken: string;
  apiDomain: string;
  expiresAtMs: number;
  user?: ZohoStoredUser | null;
}): void {
  localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, data.refreshToken);
  localStorage.setItem(ZOHO_API_DOMAIN_KEY, data.apiDomain);
  localStorage.setItem(ZOHO_TOKEN_EXPIRES_AT_KEY, String(data.expiresAtMs));
  if (data.user) {
    localStorage.setItem(ZOHO_USER_KEY, JSON.stringify(data.user));
  } else {
    localStorage.removeItem(ZOHO_USER_KEY);
  }
}

export function clearAuthTokens(): void {
  localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  localStorage.removeItem(ZOHO_API_DOMAIN_KEY);
  localStorage.removeItem(ZOHO_TOKEN_EXPIRES_AT_KEY);
  localStorage.removeItem(ZOHO_USER_KEY);
  localStorage.removeItem(APP_USER_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
}

export function getAccessTokenExpiresAtMs(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ZOHO_TOKEN_EXPIRES_AT_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** ~60s skew — refresh before hard expiry */
export function isAccessTokenLikelyExpired(): boolean {
  const at = getAccessTokenExpiresAtMs();
  if (at == null) return false;
  return Date.now() >= at - 60_000;
}

/**
 * Refresh access token via `/api/auth/zoho/refresh` and update storage.
 * Returns true if a new access token was stored.
 */
export async function refreshZohoAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  const apiDomain = localStorage.getItem(ZOHO_API_DOMAIN_KEY) ?? undefined;

  const res = await fetch("/api/auth/zoho/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh, api_domain: apiDomain }),
  });

  const data = (await res.json()) as {
    error?: string;
    access_token?: string;
    refresh_token?: string;
    api_domain?: string;
    expires_at_ms?: number;
  };

  if (!res.ok || !data.access_token) {
    return false;
  }

  const domain = data.api_domain ?? localStorage.getItem(ZOHO_API_DOMAIN_KEY) ?? "";
  if (!domain) return false;

  setZohoAuthSession({
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refresh,
    apiDomain: domain,
    expiresAtMs: data.expires_at_ms ?? Date.now() + 3600_000,
  });

  return true;
}
