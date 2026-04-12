/**
 * App-user service — merges live Zoho org users with per-user permission
 * overrides stored in Prisma.
 *
 * Zoho remains the authoritative user directory. The `UserPermission` table
 * only stores *overrides* and the per-user `active` flag; a user who has
 * never been touched in Admin > Users has no row and gets the role-based
 * default from `src/lib/permissions.ts`.
 */

import { fetchZohoOrgUsers } from "@/lib/zoho/oauth";
import { resolveAppRoleFromZohoCrmUser } from "@/lib/app-role";
import { ROLE_DEFAULTS, effectivePermissions, type FullPermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { UserPermissions, UserRole } from "@/lib/types";

export type AdminUserRow = {
  zohoUserId:      string;
  email:           string | null;
  fullName:        string;
  zohoRoleId:      string | null;
  zohoRoleName:    string | null;
  envRole:         UserRole;           // Role derived from env allowlist
  effectiveRole:   UserRole;           // Role actually in effect (override or env)
  active:          boolean;
  hasOverride:     boolean;
  permissions:     FullPermissions;    // Merged (override + role default)
  zohoStatus:      string | null;
};

/**
 * Build the Admin > Users tab's list.
 *
 * - Pulls every user from the Zoho org (`/users?type=AllUsers`).
 * - Filters out users whose current Zoho role is NOT in the env allowlist
 *   (Q2 decision — "hide stale users entirely").
 * - Filters out the currently-logged-in user (Q3 — "don't show me myself").
 * - Merges each row with any `UserPermission` override to produce the
 *   effective role + permissions shown in the UI.
 */
export async function listAdminUsers(
  accessToken: string,
  apiDomain:   string,
  excludeZohoUserId: string,
): Promise<AdminUserRow[]> {
  const [zohoUsers, overrides] = await Promise.all([
    fetchZohoOrgUsers(accessToken, apiDomain),
    prisma.userPermission.findMany(),
  ]);

  const byId = new Map(overrides.map(o => [o.zohoUserId, o]));

  const rows: AdminUserRow[] = [];
  for (const u of zohoUsers) {
    if (u.id === excludeZohoUserId) continue; // hide self

    const envRole = resolveAppRoleFromZohoCrmUser(u);
    if (envRole === null) continue; // hide stale / unmapped roles

    const override      = byId.get(u.id) ?? null;
    const effectiveRole = (override?.role as UserRole | undefined) ?? envRole;
    const active        = override?.active ?? true;
    const permissions   = effectivePermissions(effectiveRole, override);

    rows.push({
      zohoUserId:    u.id,
      email:         u.email ?? null,
      fullName:      u.full_name ?? u.email ?? u.id,
      zohoRoleId:    u.role?.id  ?? null,
      zohoRoleName:  u.role?.name ?? null,
      envRole,
      effectiveRole,
      active,
      hasOverride:   !!override,
      permissions,
      zohoStatus:    u.status ?? null,
    });
  }

  // Stable sort: admins first, then name ASC.
  rows.sort((a, b) => {
    if (a.effectiveRole !== b.effectiveRole) {
      return a.effectiveRole === "admin" ? -1 : b.effectiveRole === "admin" ? 1 : 0;
    }
    return a.fullName.localeCompare(b.fullName);
  });

  return rows;
}

/**
 * Resolve the effective role + permissions for a single user at login time.
 *
 * Returns `null` when an override exists with `active = false` — the auth
 * flow uses this to reject the login with an "access_revoked" error.
 */
export async function getEffectiveUserState(
  zohoUserId: string,
  envRole:    UserRole,
): Promise<{ role: UserRole; permissions: FullPermissions; active: boolean } | null> {
  const override = await prisma.userPermission.findUnique({ where: { zohoUserId } });

  if (!override) {
    return {
      role:        envRole,
      permissions: ROLE_DEFAULTS[envRole],
      active:      true,
    };
  }
  if (override.active === false) return null;

  const effectiveRole = (override.role as UserRole) || envRole;
  return {
    role:        effectiveRole,
    permissions: effectivePermissions(effectiveRole, override),
    active:      true,
  };
}

/**
 * Upsert a per-user permission override. The admin UI PUTs the full state
 * for a user (role + active + every permission flag) and this function
 * persists it.
 */
export async function upsertUserPermissionOverride(
  zohoUserId: string,
  input: {
    role:        UserRole;
    active:      boolean;
    permissions: Partial<UserPermissions>;
  },
) {
  const data = {
    role:                 input.role,
    active:               input.active,
    canViewLeadership:    input.permissions.canViewLeadership    ?? null,
    canAccessAdmin:       input.permissions.canAccessAdmin       ?? null,
    canReassignProspects: input.permissions.canReassignProspects ?? null,
    canViewAllProspects:  input.permissions.canViewAllProspects  ?? null,
    canMarkDead:          input.permissions.canMarkDead          ?? null,
  };
  return prisma.userPermission.upsert({
    where:  { zohoUserId },
    create: { zohoUserId, ...data },
    update: data,
  });
}
