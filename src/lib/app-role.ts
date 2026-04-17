/**
 * Bootstrap-admin env helper.
 *
 * Users whose Zoho CRM user id appears in `BOOTSTRAP_ADMIN_USER_IDS` are
 * auto-allowed to log in with the `admin` role. They bypass the
 * `UserPermission` table entirely — editing or deactivating them via
 * the Admin UI is not supported; the only way to grant/revoke bootstrap
 * admin status is by editing `.env`.
 *
 * Every other user must be explicitly added by an admin via the Users tab
 * (which creates an `active=true` `UserPermission` row). No role-based
 * env allowlist exists anymore.
 *
 * Configure in env (comma-separated Zoho user IDs):
 *   BOOTSTRAP_ADMIN_USER_IDS=1797876000000123456,1797876000000234567
 *
 * Find a user id: log in → check `zoho_user` cookie → `id`, or GET
 * /api/users and grab `id` from the response.
 */

function parseIds(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(raw.split(",").map((x) => x.trim()).filter(Boolean));
}

export function isBootstrapAdmin(zohoUserId: string | null | undefined): boolean {
  if (!zohoUserId) return false;
  return parseIds(process.env.BOOTSTRAP_ADMIN_USER_IDS).has(zohoUserId.trim());
}

export function listBootstrapAdminIds(): string[] {
  return Array.from(parseIds(process.env.BOOTSTRAP_ADMIN_USER_IDS));
}
