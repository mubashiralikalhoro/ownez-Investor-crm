import { cookies } from "next/headers";
import type { UserRole } from "@/lib/types";
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
  accessToken: string;
  apiDomain:   string;
}

type StoredUser = {
  id:    string;
  email: string | null;
  name:  string;
  role:  UserRole;
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

  return {
    userId:      user.id,
    username,
    fullName:    user.name || username,
    email:       user.email,
    role:        user.role,
    accessToken,
    apiDomain,
  };
}
