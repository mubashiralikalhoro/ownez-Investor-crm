import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDashboardQueueProspects } from "@/services/prospects";
import { getOverdueProspectIdSet } from "@/services/activity-log";

/**
 * GET /api/dashboard/queue
 *
 * Returns active prospects enriched with `hasOverdueOpenCommitment` stamped from
 * Activity_Log (one org-wide search run in parallel with the prospect fetch).
 */
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const [prospects, overdueIds] = await Promise.all([
      getDashboardQueueProspects(session.accessToken),
      getOverdueProspectIdSet(session.accessToken).catch(() => new Set<string>()),
    ]);

    const data = prospects.map((p) => ({
      ...p,
      hasOverdueOpenCommitment: overdueIds.has(p.id),
    }));

    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch dashboard queue.";
    const status = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
