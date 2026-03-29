/**
 * Zoho OAuth + CRM helpers — import only from Route Handlers / Server Components.
 */

export type ZohoTokenResponse = {
  access_token: string;
  refresh_token?: string;
  api_domain: string;
  token_type: string;
  expires_in: number;
};

/** Current user row from Zoho CRM v8 Users API — includes org Role & Profile. */
export type ZohoCrmUser = {
  id: string;
  full_name?: string;
  email?: string;
  role?: { id?: string; name?: string };
  profile?: { id?: string; name?: string };
};

type ZohoCrmUserApiRow = {
  id: string;
  full_name?: string;
  email?: string;
  role?: { name?: string; id?: string };
  profile?: { name?: string; id?: string };
};

function getAccountsBase(): string {
  return (process.env.ZOHO_ACCOUNTS_HOST || "https://accounts.zoho.com").replace(/\/$/, "");
}

export function getAppBaseUrl(): string {
  const url = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!url?.trim()) {
    throw new Error("Set APP_URL or NEXT_PUBLIC_APP_URL to your deployed origin (no trailing slash).");
  }
  return url.trim().replace(/\/$/, "");
}

export function getZohoRedirectUri(): string {
  return `${getAppBaseUrl()}/callbacks/zoho`;
}

/** Open redirect safe paths only. */
export function sanitizeOAuthNextParam(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  if (next.includes("://") || next.includes("\\")) return "/";
  return next;
}

export async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string
): Promise<ZohoTokenResponse> {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET must be set.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(`${getAccountsBase()}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const raw = await res.text();
  let data: ZohoTokenResponse & { error?: string };
  try {
    data = JSON.parse(raw) as ZohoTokenResponse & { error?: string };
  } catch {
    throw new Error(`Zoho token exchange failed (${res.status}): ${raw.slice(0, 120)}`);
  }

  if (!res.ok) {
    throw new Error(data.error || `Zoho token exchange failed (${res.status})`);
  }

  return data;
}

export async function exchangeRefreshToken(refreshToken: string): Promise<ZohoTokenResponse> {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET must be set.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch(`${getAccountsBase()}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const raw = await res.text();
  let data: ZohoTokenResponse & { error?: string };
  try {
    data = JSON.parse(raw) as ZohoTokenResponse & { error?: string };
  } catch {
    throw new Error(`Zoho refresh failed (${res.status}): ${raw.slice(0, 120)}`);
  }

  if (!res.ok) {
    throw new Error(data.error || `Zoho refresh failed (${res.status})`);
  }

  return data;
}

export async function fetchZohoCurrentUser(
  accessToken: string,
  apiDomain: string
): Promise<ZohoCrmUser | null> {
  const base = apiDomain.replace(/\/$/, "");
  const url = `${base}/crm/v8/users?type=CurrentUser`;

  const res = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho CRM users failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    users?: ZohoCrmUserApiRow[];
    data?: ZohoCrmUserApiRow[];
  };

  const list = json.users ?? json.data;
  const u = list?.[0];
  if (!u?.id) return null;

  return {
    id: String(u.id),
    full_name: u.full_name,
    email: u.email,
    role: u.role?.name || u.role?.id ? { id: u.role?.id, name: u.role?.name } : undefined,
    profile:
      u.profile?.name || u.profile?.id
        ? { id: u.profile?.id, name: u.profile?.name }
        : undefined,
  };
}
