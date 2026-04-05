/** HttpOnly Zoho token cookies — all set/cleared server-side only. */
export const ZOHO_ACCESS_COOKIE  = "zoho_access";
export const ZOHO_REFRESH_COOKIE = "zoho_refresh";
export const ZOHO_DOMAIN_COOKIE  = "zoho_domain";
export const ZOHO_USER_COOKIE    = "ownez_user";

/** Cookie lifetime helpers (seconds). */
export const ACCESS_COOKIE_MAX_AGE  = 3_600;          // 1 hour (matches Zoho token expiry)
export const SESSION_COOKIE_MAX_AGE = 30 * 24 * 3600; // 30 days

export function cookieOptions(maxAgeSec: number) {
  return {
    httpOnly:  true,
    secure:    process.env.NODE_ENV === "production",
    sameSite:  "lax" as const,
    path:      "/",
    maxAge:    maxAgeSec,
  };
}
