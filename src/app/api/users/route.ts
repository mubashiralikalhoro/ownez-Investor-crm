import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchZohoOrgUsers } from "@/lib/zoho/oauth";
import { resolveAppRoleFromZohoCrmUser } from "@/lib/app-role";

/**
 * GET /api/users
 *
 * Returns a lightweight list of Zoho org users (id + name) whose role is in
 * the env allowlist. Used by the pipeline Owner filter dropdown and anywhere
 * else a user-picker is needed.
 *
 * Auth-gated (any authenticated user), NOT admin-only.
 */
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const zohoUsers = await fetchZohoOrgUsers(session.accessToken, session.apiDomain);

    const data = zohoUsers
      .filter((u) => resolveAppRoleFromZohoCrmUser(u) !== null)
      .map((u) => ({ id: u.id, name: u.full_name ?? u.email ?? u.id }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch users.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
