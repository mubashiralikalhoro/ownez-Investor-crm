import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeRefreshToken } from "@/lib/zoho/oauth";
import {
  ZOHO_ACCESS_COOKIE,
  ZOHO_REFRESH_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  SESSION_COOKIE_MAX_AGE,
  cookieOptions,
} from "@/lib/session-constants";

/**
 * POST /api/auth/zoho/refresh
 * No body required — reads the refresh token from the httpOnly cookie.
 * Updates the access token cookie and optionally rotates the refresh token.
 */
export async function POST() {
  const jar = await cookies();
  const refreshToken = jar.get(ZOHO_REFRESH_COOKIE)?.value?.trim();

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token." }, { status: 401 });
  }

  try {
    const tokens      = await exchangeRefreshToken(refreshToken);
    const accessMaxAge = tokens.expires_in ?? ACCESS_COOKIE_MAX_AGE;

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ZOHO_ACCESS_COOKIE, tokens.access_token, cookieOptions(accessMaxAge));

    // Zoho may rotate the refresh token — update it when a new one is returned.
    if (tokens.refresh_token) {
      res.cookies.set(ZOHO_REFRESH_COOKIE, tokens.refresh_token, cookieOptions(SESSION_COOKIE_MAX_AGE));
    }

    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Refresh failed.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
