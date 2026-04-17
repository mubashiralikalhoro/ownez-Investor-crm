import { NextResponse } from "next/server";
import { listThresholds } from "@/services/pipeline-thresholds";

/**
 * GET /api/stages/thresholds
 *
 * Public endpoint — no auth. Returns the current idle-threshold (in days)
 * for each pipeline stage so other internal systems can consume the same
 * stale-flagging rules the CRM applies.
 *
 * Shape:
 *   { "data": [{ "stage": "prospect", "label": "Prospect", "idleThreshold": 10 }, ...] }
 *
 * `idleThreshold: null` means the stage never goes stale (funded / nurture / dead).
 * Seeded from src/lib/constants.ts::PIPELINE_STAGES on first call.
 */
export async function GET() {
  try {
    const data = await listThresholds();
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load thresholds.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
