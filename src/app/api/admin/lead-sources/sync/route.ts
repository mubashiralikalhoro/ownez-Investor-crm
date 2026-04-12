import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { syncAllLeadSourcesWithZoho } from "@/services/lead-sources";

/**
 * POST /api/admin/lead-sources/sync
 *
 * Bi-directional sync: fetches Zoho's Lead_Source picklist and reconciles
 * with the local DB. Sources in Zoho but not in DB are added; sources in
 * DB but not in Zoho are removed.
 */
export async function POST(_request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!session.permissions.canAccessAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const result = await syncAllLeadSourcesWithZoho(session.accessToken);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
