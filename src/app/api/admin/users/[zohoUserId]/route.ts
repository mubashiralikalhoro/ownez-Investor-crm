import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { upsertUserPermissionOverride } from "@/services/app-users";
import type { UserPermissions, UserRole } from "@/lib/types";

const VALID_ROLES: UserRole[] = ["rep", "marketing", "admin"];

/**
 * PUT /api/admin/users/[zohoUserId]
 * Body: { role, active, permissions: { canXxx?: boolean | null } }
 *
 * Upserts a permission override for the given Zoho user id.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ zohoUserId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!session.permissions.canAccessAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { zohoUserId } = await params;
  if (!zohoUserId) {
    return NextResponse.json({ error: "Missing zohoUserId." }, { status: 422 });
  }
  if (zohoUserId === session.userId) {
    return NextResponse.json(
      { error: "You cannot edit your own permissions." },
      { status: 422 },
    );
  }

  let body: {
    role?:        UserRole;
    active?:      boolean;
    permissions?: Partial<UserPermissions>;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const role = body.role;
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "role must be rep | marketing | admin." }, { status: 422 });
  }
  const active = typeof body.active === "boolean" ? body.active : true;

  try {
    const row = await upsertUserPermissionOverride(zohoUserId, {
      role,
      active,
      permissions: body.permissions ?? {},
    });
    return NextResponse.json({ data: row });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update user permissions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
