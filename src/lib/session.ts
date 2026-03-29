import { cookies } from "next/headers";
import type { UserRole } from "@/lib/types";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";
import { verifySessionJwt } from "@/lib/session-jwt";

export interface SessionPayload {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
}

/**
 * Server-only session from httpOnly JWT. Role here is cryptographically verified — use for RSC and API auth.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const v = await verifySessionJwt(token);
  if (!v) return null;

  const email = v.email ?? "";
  const username =
    email.includes("@") ? email.split("@")[0]! : email || v.sub.slice(0, 8);

  return {
    userId: v.sub,
    username,
    fullName: v.name || username,
    role: v.role,
  };
}
