import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDashboardQueueProspects } from "@/services/prospects";

/**
 * GET /api/dashboard/queue
 *
 * Custom Zoho query for the dashboard action queue.
 * Excludes Dead / Lost and Funded prospects at the Zoho level.
 * Sorts by Next_Action_Date ASC so overdue records always appear first.
 * Pages through ALL results — no missing overdue prospects regardless of
 * total pipeline size.
 */
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const data = await getDashboardQueueProspects(session.accessToken);
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch dashboard queue.";
    const status = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
