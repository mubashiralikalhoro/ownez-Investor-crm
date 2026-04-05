import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAllProspects } from "@/services/prospects";

/**
 * GET /api/leadership/data
 *
 * Returns all prospects from the Redis cache (30-min TTL via getAllProspects).
 * Stats, funnel, source ROI, and red flags are all computed client-side from
 * this single dataset — no separate Zoho calls needed.
 */
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (session.role !== "marketing" && session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const prospects = await getAllProspects(session.accessToken);
    return NextResponse.json({ prospects });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load leadership data.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
