import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";
import { verifySessionJwt } from "@/lib/session-jwt";

/** Verified session for clients — role comes from JWT, not localStorage. */
export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const v = await verifySessionJwt(token);
  if (!v) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    userId: v.sub,
    email: v.email,
    fullName: v.name,
    role: v.role,
  });
}
