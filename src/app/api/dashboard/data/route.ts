import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAllProspects } from "@/services/prospects";
import type { ZohoProspect } from "@/types";
import type { ZohoDashboardStats } from "@/services/prospects";

const ACTIVE_ZOHO_STAGES = new Set([
  "Prospect",
  "Initial Contact",
  "Discovery",
  "Pitch",
  "Active Engagement",
  "Soft Commit",
  "Commitment Processing",
  "KYC / Docs",
]);

const COMMITTED_ZOHO_STAGES = new Set([
  "Soft Commit",
  "Commitment Processing",
  "KYC / Docs",
]);

function computeStats(prospects: ZohoProspect[]): ZohoDashboardStats {
  const active    = prospects.filter(p => ACTIVE_ZOHO_STAGES.has(p.Pipeline_Stage ?? ""));
  const committed = prospects.filter(p => COMMITTED_ZOHO_STAGES.has(p.Pipeline_Stage ?? ""));
  const funded    = prospects.filter(p => p.Pipeline_Stage === "Funded");

  return {
    activePipelineCount: active.length,
    pipelineValue:  active.reduce((s, p) => s + (p.Initial_Investment_Target ?? 0), 0),
    committedValue: committed.reduce((s, p) => s + (p.Committed_Amount ?? 0), 0),
    fundedYTD:      funded.reduce((s, p) => s + (p.Committed_Amount ?? 0), 0),
  };
}

/**
 * GET /api/dashboard/data
 *
 * Returns all prospects (from Redis cache, 30-min TTL) plus stats computed
 * from the same dataset. Single source of truth for the dashboard.
 *
 * Response:
 *   { prospects: ZohoProspect[], stats: ZohoDashboardStats }
 */
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const prospects = await getAllProspects(session.accessToken);
    const stats     = computeStats(prospects);

    return NextResponse.json({ prospects, stats });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load dashboard data.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
