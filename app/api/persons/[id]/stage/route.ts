import { NextRequest, NextResponse } from "next/server";
import { getDataService } from "@/lib/data";
import { requireSession } from "@/lib/auth";
import { getTodayCT } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/constants";
import type { PipelineStage } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { newStage } = await request.json();

    const ds = await getDataService();
    const person = await ds.getPerson(id);
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    const oldStage = person.pipelineStage;
    const today = getTodayCT();

    // Update person's stage
    await ds.updatePerson(id, {
      pipelineStage: newStage as PipelineStage,
      stageChangedDate: today,
    });

    // Auto-log stage change activity
    const oldLabel = oldStage ? STAGE_LABELS[oldStage] : "None";
    const newLabel = STAGE_LABELS[newStage as PipelineStage] || newStage;

    await ds.createActivity(id, {
      activityType: "stage_change",
      source: "manual",
      date: today,
      time: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "America/Chicago" }),
      outcome: "connected",
      detail: `Stage updated from ${oldLabel} to ${newLabel}`,
      documentsAttached: [],
      loggedById: session.userId,
      annotation: null,
    });

    return NextResponse.json({ success: true, oldStage, newStage });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
