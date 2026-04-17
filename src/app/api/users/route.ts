import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchZohoOrgUsers } from "@/lib/zoho/oauth";
import { getAuthorizedRoleMap } from "@/services/app-users";

/**
 * GET /api/users
 *
 * Returns a lightweight list of Zoho org users (id + name) who are
 * currently authorized to log in (bootstrap admins + active override rows).
 * Used by the pipeline Owner filter dropdown and anywhere else a
 * user-picker is needed.
 *
 * Auth-gated (any authenticated user), NOT admin-only.
 */
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const [zohoUsers, roleMap] = await Promise.all([
      fetchZohoOrgUsers(session.accessToken, session.apiDomain),
      getAuthorizedRoleMap(),
    ]);

    const data = zohoUsers
      .filter((u) => roleMap.has(u.id))
      .map((u) => ({ id: u.id, name: u.full_name ?? u.email ?? u.id }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch users.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
