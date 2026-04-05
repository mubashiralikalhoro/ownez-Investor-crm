import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ZOHO_ACCESS_COOKIE,
  ZOHO_REFRESH_COOKIE,
  ZOHO_DOMAIN_COOKIE,
  ZOHO_USER_COOKIE,
} from "@/lib/session-constants";

export async function POST() {
  const jar = await cookies();
  jar.delete(ZOHO_ACCESS_COOKIE);
  jar.delete(ZOHO_REFRESH_COOKIE);
  jar.delete(ZOHO_DOMAIN_COOKIE);
  jar.delete(ZOHO_USER_COOKIE);

  return NextResponse.json({ ok: true });
}
