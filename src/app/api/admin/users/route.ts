import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listAdminUsers } from "@/services/app-users";

/**
 * GET /api/admin/users
 *
 * Returns the merged Zoho-org-users + per-user-override list for the Admin
 * > Users tab. Excludes the logged-in user and users whose Zoho role isn't
 * in the env allowlist.
 */
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!session.permissions.canAccessAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const users = await listAdminUsers(session.accessToken, session.apiDomain, session.userId);
    return NextResponse.json({ data: users });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch admin users.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
