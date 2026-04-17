/**
 * App-user service — merges the env-defined bootstrap admin list with
 * explicitly-added users stored as `UserPermission` rows in Prisma.
 *
 * Zoho remains the authoritative user directory (names, emails, Zoho role),
 * but **authorization to log in** is gated by one of two mechanisms:
 *
 *   1. The user's Zoho id is in `BOOTSTRAP_ADMIN_USER_IDS` → auto-allowed
 *      as admin, with role defaults. No Prisma row needed.
 *   2. A `UserPermission` row exists with `active=true` → allowed with the
 *      role + permissions encoded in that row.
 *
 * Any other Zoho org user cannot log in until an admin adds them through
 * the Admin > Users > Add user flow.
 */

import { fetchZohoOrgUsers, type ZohoCrmUser, type ZohoOrgUser } from "@/lib/zoho/oauth";
import { isBootstrapAdmin, listBootstrapAdminIds } from "@/lib/app-role";
import { ROLE_DEFAULTS, effectivePermissions, type FullPermissions } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { UserPermissions, UserRole } from "@/lib/types";

export type AdminUserRow = {
  zohoUserId:    string;
  email:         string | null;
  fullName:      string;
  zohoRoleId:    string | null;
  zohoRoleName:  string | null;
  /** How this user is authorized — drives which controls the UI enables. */
  source:        "env" | "override";
  effectiveRole: UserRole;
  active:        boolean;
  hasOverride:   boolean;
  permissions:   FullPermissions;
  zohoStatus:    string | null;
};

export type AvailableUserRow = {
  zohoUserId:   string;
  email:        string | null;
  fullName:     string;
  zohoRoleId:   string | null;
  zohoRoleName: string | null;
  zohoStatus:   string | null;
};

/**
 * Admin > Users listing. Shows only users who can currently log in:
 *   - Bootstrap admins from env (role fixed, controls disabled in UI).
 *   - Users with a `UserPermission` row where `active === true`.
 * Inactive override rows are hidden — deleted-then-not-re-added users
 * disappear from the list entirely.
 */
export async function listAdminUsers(
  accessToken:       string,
  apiDomain:         string,
  excludeZohoUserId: string,
): Promise<AdminUserRow[]> {
  const [zohoUsers, overrides] = await Promise.all([
    fetchZohoOrgUsers(accessToken, apiDomain),
    prisma.userPermission.findMany({ where: { active: true } }),
  ]);

  const overrideById = new Map(overrides.map((o) => [o.zohoUserId, o]));
  const bootstrapIds = new Set(listBootstrapAdminIds());
  const byZohoId     = new Map(zohoUsers.map((u) => [u.id, u]));

  const rows: AdminUserRow[] = [];

  // Bootstrap admins first.
  for (const id of bootstrapIds) {
    if (id === excludeZohoUserId) continue;
    const u = byZohoId.get(id);
    rows.push({
      zohoUserId:    id,
      email:         u?.email ?? null,
      fullName:      u?.full_name ?? u?.email ?? id,
      zohoRoleId:    u?.role?.id   ?? null,
      zohoRoleName:  u?.role?.name ?? null,
      source:        "env",
      effectiveRole: "admin",
      active:        true,
      hasOverride:   false,
      permissions:   ROLE_DEFAULTS.admin,
      zohoStatus:    u?.status ?? null,
    });
  }

  // Active override rows — skip anyone also in the env list to avoid duplicates.
  for (const ov of overrides) {
    if (ov.zohoUserId === excludeZohoUserId) continue;
    if (bootstrapIds.has(ov.zohoUserId))     continue;
    const u             = byZohoId.get(ov.zohoUserId);
    const effectiveRole = (ov.role as UserRole) || "rep";
    rows.push({
      zohoUserId:    ov.zohoUserId,
      email:         u?.email ?? null,
      fullName:      u?.full_name ?? u?.email ?? ov.zohoUserId,
      zohoRoleId:    u?.role?.id   ?? null,
      zohoRoleName:  u?.role?.name ?? null,
      source:        "override",
      effectiveRole,
      active:        true,
      hasOverride:   true,
      permissions:   effectivePermissions(effectiveRole, overrideById.get(ov.zohoUserId)),
      zohoStatus:    u?.status ?? null,
    });
  }

  rows.sort((a, b) => {
    if (a.effectiveRole !== b.effectiveRole) {
      return a.effectiveRole === "admin" ? -1 : b.effectiveRole === "admin" ? 1 : 0;
    }
    return a.fullName.localeCompare(b.fullName);
  });

  return rows;
}

/**
 * Candidate Zoho users for the "Add user" dialog — everyone in the org who
 * isn't already authorized and isn't the current admin.
 */
export async function listAvailableUsers(
  accessToken:       string,
  apiDomain:         string,
  excludeZohoUserId: string,
): Promise<AvailableUserRow[]> {
  // Only active overrides are "taken" — users with `active=false` rows have
  // been soft-deleted and should be selectable again through the Add dialog.
  const [zohoUsers, activeOverrides] = await Promise.all([
    fetchZohoOrgUsers(accessToken, apiDomain),
    prisma.userPermission.findMany({
      where:  { active: true },
      select: { zohoUserId: true },
    }),
  ]);

  const takenIds = new Set<string>([
    excludeZohoUserId,
    ...listBootstrapAdminIds(),
    ...activeOverrides.map((o) => o.zohoUserId),
  ]);

  return zohoUsers
    .filter((u) => !takenIds.has(u.id))
    .map((u) => ({
      zohoUserId:   u.id,
      email:        u.email ?? null,
      fullName:     u.full_name ?? u.email ?? u.id,
      zohoRoleId:   u.role?.id   ?? null,
      zohoRoleName: u.role?.name ?? null,
      zohoStatus:   (u as ZohoOrgUser).status ?? null,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

/**
 * Resolve authorization for a Zoho user attempting to log in.
 *
 * Return values:
 *   - `{ role, permissions, source: "env" }`      — bootstrap admin
 *   - `{ role, permissions, source: "override" }` — active override row
 *   - `"revoked"`   — override row exists but active=false
 *   - `"not_authorized"` — no env entry and no override row
 */
export type AuthorizedUser = {
  role:        UserRole;
  permissions: FullPermissions;
  source:      "env" | "override";
};

export async function resolveAuthorizedUser(
  zohoUser: ZohoCrmUser | null,
): Promise<AuthorizedUser | "revoked" | "not_authorized"> {
  const zohoUserId = zohoUser?.id?.trim();
  if (!zohoUserId) return "not_authorized";

  if (isBootstrapAdmin(zohoUserId)) {
    return { role: "admin", permissions: ROLE_DEFAULTS.admin, source: "env" };
  }

  const override = await prisma.userPermission.findUnique({ where: { zohoUserId } });
  if (!override) return "not_authorized";
  if (override.active === false) return "revoked";

  const role = (override.role as UserRole) || "rep";
  return {
    role,
    permissions: effectivePermissions(role, override),
    source:      "override",
  };
}

/**
 * Lightweight map of all Zoho user IDs currently authorized to log in,
 * keyed to their effective role. Used by the user-picker endpoints that
 * only need to know "can this user log in, and as what role?".
 */
export async function getAuthorizedRoleMap(): Promise<Map<string, UserRole>> {
  const activeOverrides = await prisma.userPermission.findMany({
    where:  { active: true },
    select: { zohoUserId: true, role: true },
  });
  const map = new Map<string, UserRole>();
  for (const id of listBootstrapAdminIds()) {
    map.set(id, "admin");
  }
  for (const row of activeOverrides) {
    map.set(row.zohoUserId, (row.role as UserRole) || "rep");
  }
  return map;
}

/** Upsert a per-user permission override. */
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

/**
 * Add a user via the admin dialog. Refuses to touch bootstrap-admin env
 * users (the override row would be inert, but creating it would be
 * confusing). For a previously-removed user (active=false row), this
 * flips them back to active with the chosen role and fresh role defaults.
 */
export async function addUserFromZoho(
  zohoUserId: string,
  role:       UserRole,
) {
  if (isBootstrapAdmin(zohoUserId)) {
    throw new Error("User is already authorized via BOOTSTRAP_ADMIN_USER_IDS.");
  }
  return upsertUserPermissionOverride(zohoUserId, {
    role,
    active:      true,
    permissions: {}, // pure role defaults — admin can refine after the fact
  });
}
