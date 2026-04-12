import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAllProspects } from "@/services/prospects";
import { getAppSettings } from "@/services/app-settings";

/**
 * GET /api/leadership/data
 *
 * Returns all prospects from the Redis cache (30-min TTL via getAllProspects).
 * Stats, funnel, source ROI, and red flags are all computed client-side from
 * this single dataset — no separate Zoho calls needed.
 *
 * Query params:
 *   refresh=1 — bypass Redis and repopulate from Zoho.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!session.permissions.canViewLeadership) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const force = request.nextUrl.searchParams.get("refresh") === "1";

  try {
    const [result, settings] = await Promise.all([
      getAllProspects(session.accessToken, { force }),
      getAppSettings(),
    ]);
    return NextResponse.json({
      prospects:  result.data,
      cachedAt:   result.cachedAt,
      fromCache:  result.fromCache,
      fundTarget: settings.fundTarget,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load leadership data.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
