import type { UserRole } from "@/lib/types";
import type { ZohoCrmUser } from "@/lib/zoho/oauth";

function parseIds(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(",").map((x) => x.trim()).filter(Boolean);
}

/**
 * Resolves the app UserRole from the Zoho CRM current user object.
 *
 * Configure in env (comma-separated Zoho role IDs — exact numeric strings):
 *   ZOHO_ADMIN_ROLE_IDS=1797876000000026005
 *   ZOHO_REP_ROLE_IDS=1797876000000099001,1797876000000099002
 *
 * Find a role ID: log in → check `zoho_user` in localStorage → `role.id`.
 * Returns null if the role ID is not in either list — access is denied.
 */
export function resolveAppRoleFromZohoCrmUser(
  user: ZohoCrmUser | null
): UserRole | null {
  const roleId = user?.role?.id?.trim();
  if (!roleId) return null;

  if (parseIds(process.env.ZOHO_ADMIN_ROLE_IDS).includes(roleId)) return "admin";
  if (parseIds(process.env.ZOHO_REP_ROLE_IDS).includes(roleId)) return "rep";

  return null;
}
