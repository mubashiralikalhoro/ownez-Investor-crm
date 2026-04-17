import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listAvailableUsers } from "@/services/app-users";

/**
 * GET /api/admin/users/available
 *
 * Returns Zoho org users not yet authorized as app users — the candidate
 * pool for the Admin > Users > Add user dropdown. Excludes the current
 * admin, bootstrap-env admins, and users with any existing UserPermission
 * row (active or not) to prevent duplicates; re-adding a removed user
 * goes through the same POST /api/admin/users flow which upserts.
 */
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!session.permissions.canAccessAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const users = await listAvailableUsers(
      session.accessToken,
      session.apiDomain,
      session.userId,
    );
    return NextResponse.json({ data: users });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load Zoho users.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
