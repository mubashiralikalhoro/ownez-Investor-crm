import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeAuthorizationCode,
  fetchZohoCurrentUser,
  getZohoRedirectUri,
  sanitizeOAuthNextParam,
} from "@/lib/zoho/oauth";
import { resolveAppRoleFromZohoCrmUser } from "@/lib/app-role";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";
import {
  signSessionJwt,
  sessionCookieMaxAgeSec,
  sessionCookieOptions,
} from "@/lib/session-jwt";

const STATE_COOKIE = "zoho_oauth_state";
const NEXT_COOKIE = "zoho_oauth_next";

export async function POST(request: Request) {
  let body: { code?: string; state?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const code = body.code;
  const state = body.state;

  if (!code || !state) {
    return NextResponse.json({ error: "code and state are required." }, { status: 400 });
  }

  const jar = await cookies();
  const expectedState = jar.get(STATE_COOKIE)?.value;
  const nextRaw = jar.get(NEXT_COOKIE)?.value ?? "/";
  const next = sanitizeOAuthNextParam(nextRaw);

  jar.delete(STATE_COOKIE);
  jar.delete(NEXT_COOKIE);

  if (!expectedState || expectedState !== state) {
    return NextResponse.json({ error: "Invalid or expired OAuth state." }, { status: 400 });
  }

  const redirectUri = getZohoRedirectUri();

  let tokens;
  try {
    tokens = await exchangeAuthorizationCode(code, redirectUri);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Token exchange failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!tokens.refresh_token) {
    return NextResponse.json(
      {
        error:
          "Zoho did not return a refresh_token. Ensure access_type=offline and prompt=consent, and re-authorize the app.",
      },
      { status: 400 }
    );
  }

  const expiresAtMs = Date.now() + (tokens.expires_in ?? 3600) * 1000;

  let user = null;
  let userFetchWarning: string | undefined;
  try {
    user = await fetchZohoCurrentUser(tokens.access_token, tokens.api_domain);
  } catch (e) {
    userFetchWarning =
      e instanceof Error ? e.message : "Failed to load Zoho current user.";
  }

  const role = resolveAppRoleFromZohoCrmUser(user);

  if (role === null) {
    const zohoRoleId = user?.role?.id ?? "unknown";
    const zohoRoleName = user?.role?.name ?? "unknown";
    return NextResponse.json(
      {
        error: "role_not_allowed",
        error_description:
          `Your Zoho role "${zohoRoleName}" (id: ${zohoRoleId}) is not allowed to access this app. ` +
          `Contact your administrator to be added to ZOHO_ADMIN_ROLE_IDS or ZOHO_REP_ROLE_IDS.`,
      },
      { status: 403 }
    );
  }

  const email = user?.email ?? null;
  const fullName = user?.full_name?.trim() || email || "User";
  const sub = user?.id ?? `zoho-${crypto.randomUUID()}`;

  const maxAge = sessionCookieMaxAgeSec();
  let sessionJwt: string;
  try {
    sessionJwt = await signSessionJwt(
      { sub, email, name: fullName, role },
      maxAge
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to sign session (check JWT_SECRET).";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const appUser = {
    id: sub,
    email,
    full_name: fullName,
    role,
    zoho_role_id: user?.role?.id ?? null,
    zoho_role_name: user?.role?.name ?? null,
    zoho_profile_name: user?.profile?.name ?? null,
  };

  const res = NextResponse.json({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    api_domain: tokens.api_domain,
    expires_in: tokens.expires_in,
    expires_at_ms: expiresAtMs,
    token_type: tokens.token_type,
    user,
    app_user: appUser,
    next,
    ...(userFetchWarning ? { user_fetch_warning: userFetchWarning } : {}),
  });

  res.cookies.set(SESSION_COOKIE_NAME, sessionJwt, sessionCookieOptions(maxAge));
  return res;
}
