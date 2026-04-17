import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listAdminUsers, addUserFromZoho } from "@/services/app-users";
import type { UserRole } from "@/lib/types";

const VALID_ROLES: UserRole[] = ["rep", "marketing", "admin"];

/**
 * GET /api/admin/users
 *
 * Returns the list of users currently authorized to log in (bootstrap
 * admins + active override rows) merged with their Zoho CRM profile info.
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

/**
 * POST /api/admin/users
 * Body: { zohoUserId: string, role: UserRole }
 *
 * Adds a Zoho CRM user as an authorized app user. Creates a UserPermission
 * row with `active: true`, the chosen role, and no per-permission overrides
 * (pure role defaults). If the user had been removed previously (active=false),
 * this re-activates them with the new role.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!session.permissions.canAccessAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { zohoUserId?: string; role?: UserRole };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const zohoUserId = body.zohoUserId?.trim();
  const role       = body.role;
  if (!zohoUserId) {
    return NextResponse.json({ error: "zohoUserId is required." }, { status: 422 });
  }
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "role must be rep | marketing | admin." }, { status: 422 });
  }
  if (zohoUserId === session.userId) {
    return NextResponse.json({ error: "Cannot add yourself." }, { status: 422 });
  }

  try {
    const row = await addUserFromZoho(zohoUserId, role);
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to add user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
