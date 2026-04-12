import { cookies } from "next/headers";
import type { UserPermissions, UserRole } from "@/lib/types";
import { ROLE_DEFAULTS, effectivePermissions, type FullPermissions } from "@/lib/permissions";
import {
  ZOHO_ACCESS_COOKIE,
  ZOHO_DOMAIN_COOKIE,
  ZOHO_USER_COOKIE,
} from "@/lib/session-constants";

export interface SessionPayload {
  userId:      string;
  username:    string;
  fullName:    string;
  email:       string | null;
  role:        UserRole;
  permissions: FullPermissions;
  accessToken: string;
  apiDomain:   string;
}

type StoredUser = {
  id:          string;
  email:       string | null;
  name:        string;
  role:        UserRole;
  /** Optional — only present on cookies minted after the permissions rollout.
   *  Older cookies fall back to ROLE_DEFAULTS[role]. */
  permissions?: Partial<UserPermissions>;
};

const VALID_ROLES: UserRole[] = ["rep", "marketing", "admin"];

/**
 * Server-only session from httpOnly cookies.
 * Returns null if any required cookie is missing or malformed.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();

  const accessToken = jar.get(ZOHO_ACCESS_COOKIE)?.value?.trim();
  const apiDomain   = jar.get(ZOHO_DOMAIN_COOKIE)?.value?.trim();
  const userRaw     = jar.get(ZOHO_USER_COOKIE)?.value;

  if (!accessToken || !apiDomain || !userRaw) return null;

  let user: StoredUser;
  try {
    user = JSON.parse(userRaw) as StoredUser;
  } catch {
    return null;
  }

  if (!user.id || !VALID_ROLES.includes(user.role)) return null;

  const email    = user.email ?? "";
  const username = email.includes("@") ? email.split("@")[0]! : email || user.id.slice(0, 8);

  // Merge any override that was stashed at login time with the role template.
  // Older cookies (pre-permissions rollout) have no `permissions` field —
  // they get the full role default, which matches their pre-rollout behavior.
  const permissions = effectivePermissions(user.role, user.permissions);

  return {
    userId:      user.id,
    username,
    fullName:    user.name || username,
    email:       user.email,
    role:        user.role,
    permissions,
    accessToken,
    apiDomain,
  };
}

// Re-export for callers that build/write the cookie.
export { ROLE_DEFAULTS };
