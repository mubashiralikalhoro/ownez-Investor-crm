import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";

export async function POST() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);

  return NextResponse.json({ ok: true });
}
