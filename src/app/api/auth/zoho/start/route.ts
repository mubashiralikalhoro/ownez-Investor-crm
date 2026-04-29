import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getZohoRedirectUri, sanitizeOAuthNextParam } from "@/lib/zoho/oauth";

const STATE_COOKIE = "zoho_oauth_state";
const NEXT_COOKIE = "zoho_oauth_next";

export async function GET(request: NextRequest) {
  const clientId = process.env.ZOHO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "ZOHO_CLIENT_ID is not configured." },
      { status: 500 }
    );
  }

  let redirectUri: string;
  try {
    redirectUri = getZohoRedirectUri();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "APP_URL missing." },
      { status: 500 }
    );
  }
  const state = crypto.randomUUID();
  const next = sanitizeOAuthNextParam(request.nextUrl.searchParams.get("next"));

  const jar = await cookies();
  const cookieBase = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  };

  jar.set(STATE_COOKIE, state, cookieBase);
  jar.set(NEXT_COOKIE, next, cookieBase);

  const accountsHost = (process.env.ZOHO_ACCOUNTS_HOST || "https://accounts.zoho.com").replace(
    /\/$/,
    ""
  );

  // Scopes:
  //   ZohoCRM.modules.ALL         — read/write prospect records, notes, calls, events
  //   ZohoCRM.users.READ          — GET /users for role resolution + admin user list
  //   ZohoCRM.settings.fields.ALL — read + update Lead_Source picklist (admin lead-source sync)
  //   ZohoVoice.call.READ         — read Zoho Voice call logs by phone (unlinked Voice calls)
  const scope =
    "ZohoCRM.modules.ALL,ZohoCRM.users.READ,ZohoCRM.settings.fields.ALL,ZohoVoice.call.READ";

  const params = new URLSearchParams({
    scope,
    client_id: clientId,
    response_type: "code",
    access_type: "offline",
    redirect_uri: redirectUri,
    prompt: "consent",
    state,
  });

  const authUrl = `${accountsHost}/oauth/v2/auth?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
