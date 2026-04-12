/**
 * Role-based permission templates + merge helper.
 *
 * Each local app role (rep / marketing / admin) has a default permission set
 * here. A per-user override row in the `UserPermission` Prisma table can set
 * individual flags to `true`/`false` — anything left `null` falls back to the
 * role template.
 *
 * The resolved effective permissions are stashed in the session cookie at
 * login time (see src/app/api/auth/zoho/token/route.ts) so guards throughout
 * the app can simply read `session.permissions.xxx`.
 */

import type { UserPermissions, UserRole } from "@/lib/types";

/** Fully-populated permission set (no undefined values). */
export type FullPermissions = Required<UserPermissions>;

export const ROLE_DEFAULTS: Record<UserRole, FullPermissions> = {
  rep: {
    canViewLeadership:    false,
    canAccessAdmin:       false,
    canReassignProspects: false,
    canViewAllProspects:  true,
    canMarkDead:          true,
  },
  marketing: {
    canViewLeadership:    true,
    canAccessAdmin:       false,
    canReassignProspects: false,
    canViewAllProspects:  true,
    canMarkDead:          true,
  },
  admin: {
    canViewLeadership:    true,
    canAccessAdmin:       true,
    canReassignProspects: true,
    canViewAllProspects:  true,
    canMarkDead:          true,
  },
};

/**
 * Merge a role-based default with an optional per-user override. Any override
 * key set to `true`/`false` wins; `null`/`undefined` falls back to the role
 * default. Accepts the raw Prisma row shape (values typed as `boolean | null`).
 */
type PermissionOverride = {
  [K in keyof UserPermissions]?: boolean | null;
};

export function effectivePermissions(
  role: UserRole,
  override?: PermissionOverride | null,
): FullPermissions {
  const base = ROLE_DEFAULTS[role];
  if (!override) return base;
  return {
    canViewLeadership:    override.canViewLeadership    ?? base.canViewLeadership,
    canAccessAdmin:       override.canAccessAdmin       ?? base.canAccessAdmin,
    canReassignProspects: override.canReassignProspects ?? base.canReassignProspects,
    canViewAllProspects:  override.canViewAllProspects  ?? base.canViewAllProspects,
    canMarkDead:          override.canMarkDead          ?? base.canMarkDead,
  };
}
