import { NextResponse } from "next/server";
import type { SessionPayload } from "@/lib/session";
import { getProspectById } from "@/services/prospects";

/**
 * Returns a 403 NextResponse if the session user is not authorized to access
 * the given prospect, or null if access is allowed.
 *
 * Users with canViewAllProspects can access any prospect.
 * Others may only access prospects they own.
 */
export async function checkProspectAccess(
  session: SessionPayload,
  prospectId: string,
): Promise<NextResponse | null> {
  if (session.permissions.canViewAllProspects) return null;

  try {
    const prospect = await getProspectById(session.accessToken, prospectId);
    if (prospect.Owner.id === session.userId) return null;
  } catch {
    // Cannot verify ownership → deny
  }

  return NextResponse.json({ error: "Forbidden." }, { status: 403 });
}
