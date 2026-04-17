import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateThreshold } from "@/services/pipeline-thresholds";
import { PIPELINE_STAGES } from "@/lib/constants";
import type { PipelineStage } from "@/lib/types";

const VALID_STAGES = new Set<string>(PIPELINE_STAGES.map((s) => s.key));

/**
 * PUT /api/admin/stages/thresholds
 * Body: { stage: PipelineStage, idleThreshold: number | null }
 *
 * Admin-only. Upserts the threshold row and refreshes the module-level
 * cache so `computeIsStale` picks up the new value immediately.
 */
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!session.permissions.canAccessAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { stage?: string; idleThreshold?: number | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const stage = body.stage;
  if (!stage || !VALID_STAGES.has(stage)) {
    return NextResponse.json({ error: "Unknown pipeline stage." }, { status: 422 });
  }

  const raw = body.idleThreshold;
  const idleThreshold: number | null =
    raw === null || raw === undefined
      ? null
      : typeof raw === "number" && Number.isFinite(raw) && raw >= 0
        ? Math.floor(raw)
        : NaN;

  if (Number.isNaN(idleThreshold)) {
    return NextResponse.json(
      { error: "idleThreshold must be a non-negative integer or null." },
      { status: 422 },
    );
  }

  try {
    const row = await updateThreshold(stage as PipelineStage, idleThreshold);
    return NextResponse.json({ data: row });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update threshold.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
