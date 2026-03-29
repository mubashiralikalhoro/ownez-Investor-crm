import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/lib/types";

export type SessionJwtClaims = {
  sub: string;
  email: string | null;
  name: string;
  role: UserRole;
};

function getSecretKey(): Uint8Array {
  const s = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "JWT_SECRET (or SESSION_SECRET) must be set to at least 16 characters for session signing."
    );
  }
  return new TextEncoder().encode(s);
}

const ROLES: UserRole[] = ["rep", "marketing", "admin"];

function isUserRole(v: unknown): v is UserRole {
  return typeof v === "string" && (ROLES as string[]).includes(v);
}

export async function signSessionJwt(
  claims: SessionJwtClaims,
  maxAgeSec: number
): Promise<string> {
  const key = getSecretKey();
  return new SignJWT({
    email: claims.email,
    name: claims.name,
    role: claims.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(key);
}

export async function verifySessionJwt(token: string): Promise<SessionJwtClaims | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key);
    if (!payload.sub || !isUserRole(payload.role)) return null;
    return {
      sub: String(payload.sub),
      email: typeof payload.email === "string" ? payload.email : null,
      name: typeof payload.name === "string" ? payload.name : "",
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function sessionCookieMaxAgeSec(): number {
  const raw = process.env.SESSION_JWT_MAX_AGE_SEC;
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 60) return n;
  }
  return 60 * 60 * 24 * 7; // 7 days
}

export function sessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}
