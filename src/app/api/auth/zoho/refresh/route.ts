import { NextResponse } from "next/server";
import { exchangeRefreshToken } from "@/lib/zoho/oauth";

export async function POST(request: Request) {
  let body: { refresh_token?: string; api_domain?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const refreshToken = body.refresh_token?.trim();
  if (!refreshToken) {
    return NextResponse.json({ error: "refresh_token is required." }, { status: 400 });
  }

  try {
    const tokens = await exchangeRefreshToken(refreshToken);
    const expiresAtMs = Date.now() + (tokens.expires_in ?? 3600) * 1000;
    const apiDomain =
      tokens.api_domain?.replace(/\/$/, "") ||
      body.api_domain?.replace(/\/$/, "") ||
      "";

    if (!apiDomain) {
      return NextResponse.json(
        { error: "api_domain missing from Zoho response; pass api_domain in the request body." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? refreshToken,
      api_domain: apiDomain,
      expires_in: tokens.expires_in,
      expires_at_ms: expiresAtMs,
      token_type: tokens.token_type,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Refresh failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
