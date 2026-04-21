import { NextResponse } from "next/server";
import {
  exchangeAuthorizationCode,
  fetchZohoCurrentUser,
  getZohoRedirectUri,
  sanitizeOAuthNextParam,
} from "@/lib/zoho/oauth";
import { resolveAuthorizedUser } from "@/services/app-users";
import {
  ZOHO_ACCESS_COOKIE,
  ZOHO_REFRESH_COOKIE,
  ZOHO_DOMAIN_COOKIE,
  ZOHO_USER_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  SESSION_COOKIE_MAX_AGE,
  cookieOptions,
} from "@/lib/session-constants";
import { cookies } from "next/headers";

const STATE_COOKIE = "zoho_oauth_state";
const NEXT_COOKIE  = "zoho_oauth_next";

export async function POST(request: Request) {
  let body: { code?: string; state?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { code, state } = body;
  if (!code || !state) {
    return NextResponse.json({ error: "code and state are required." }, { status: 400 });
  }

  const jar = await cookies();
  const expectedState = jar.get(STATE_COOKIE)?.value;
  const nextRaw       = jar.get(NEXT_COOKIE)?.value ?? "/";
  const next          = sanitizeOAuthNextParam(nextRaw);

  jar.delete(STATE_COOKIE);
  jar.delete(NEXT_COOKIE);

  if (!expectedState || expectedState !== state) {
    return NextResponse.json({ error: "Invalid or expired OAuth state." }, { status: 400 });
  }

  let tokens;
  try {
    tokens = await exchangeAuthorizationCode(code, getZohoRedirectUri());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Token exchange failed." },
      { status: 400 }
    );
  }

  if (!tokens.refresh_token) {
    return NextResponse.json(
      { error: "Zoho did not return a refresh_token. Re-authorize the app with access_type=offline." },
      { status: 400 }
    );
  }

  let user = null;
  let userFetchWarning: string | undefined;
  try {
    user = await fetchZohoCurrentUser(tokens.access_token, tokens.api_domain);
  } catch (e) {
    userFetchWarning = e instanceof Error ? e.message : "Failed to load Zoho current user.";
  }

  const authorized = await resolveAuthorizedUser(user);
  if (authorized === "revoked") {
    return NextResponse.json(
      {
        error:             "access_revoked",
        error_description: "Your access to this app has been revoked by an administrator.",
        user_id:           user?.id ?? null,
        user_email:        user?.email ?? null,
      },
      { status: 403 }
    );
  }
  if (authorized === "not_authorized") {
    return NextResponse.json(
      {
        error:             "not_authorized",
        error_description: "Your Zoho user is not authorized to access this app. Ask an admin to add you.",
        user_id:           user?.id ?? null,
        user_email:        user?.email ?? null,
      },
      { status: 403 }
    );
  }

  const sub       = user?.id ?? `zoho-${crypto.randomUUID()}`;
  const effective = authorized;

  const email    = user?.email ?? null;
  const fullName = user?.full_name?.trim() || email || "User";

  const appUser = {
    id:                sub,
    email,
    full_name:         fullName,
    role:              effective.role,
    zoho_role_id:      user?.role?.id    ?? null,
    zoho_role_name:    user?.role?.name  ?? null,
    zoho_profile_name: user?.profile?.name ?? null,
  };

  const storedUser = JSON.stringify({
    id:          sub,
    email,
    name:        fullName,
    role:        effective.role,
    permissions: effective.permissions,
  });
  const accessMaxAge = tokens.expires_in ?? ACCESS_COOKIE_MAX_AGE;

  const res = NextResponse.json({
    app_user: appUser,
    next,
    ...(userFetchWarning ? { user_fetch_warning: userFetchWarning } : {}),
  });

  res.cookies.set(ZOHO_ACCESS_COOKIE,  tokens.access_token,  cookieOptions(accessMaxAge));
  res.cookies.set(ZOHO_REFRESH_COOKIE, tokens.refresh_token,  cookieOptions(SESSION_COOKIE_MAX_AGE));
  res.cookies.set(ZOHO_DOMAIN_COOKIE,  tokens.api_domain,     cookieOptions(SESSION_COOKIE_MAX_AGE));
  res.cookies.set(ZOHO_USER_COOKIE,    storedUser,            cookieOptions(SESSION_COOKIE_MAX_AGE));

  return res;
}
