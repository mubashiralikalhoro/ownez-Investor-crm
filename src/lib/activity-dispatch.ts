/**
 * Client-side dispatcher for logging activities and updating prospect fields.
 *
 * Calls the Next.js API routes — which in turn call Zoho via the service layer.
 * No silent fallbacks: a failed Call/Event POST throws with the Zoho error
 * message so the UI can surface it to the user.
 */

import type { ActivityType, PipelineStage } from "@/lib/types";
import { PROSPECT_PROGRESSION_STAGES } from "@/lib/prospect-config";

/**
 * Local enum → Zoho picklist label. Local-only map — no need to modify
 * src/lib/zoho-map.ts (which only exports the inverse direction). Kept in
 * sync with PIPELINE_STAGES in src/lib/constants.ts.
 */
export const STAGE_ENUM_TO_ZOHO: Record<PipelineStage, string> = {
  prospect:               "Prospect",
  initial_contact:        "Initial Contact",
  discovery:              "Discovery",
  pitch:                  "Pitch",
  active_engagement:      "Active Engagement",
  soft_commit:            "Soft Commit",
  commitment_processing:  "Commitment Processing",
  kyc_docs:               "KYC / Docs",
  funded:                 "Funded",
  nurture:                "Nurture",
  dead:                   "Dead / Lost",
};

async function extractError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json() as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Log a freeform activity against a prospect.
 *
 * `call`  → POST /api/prospects/[id]/calls  (real Zoho Call record)
 * `meeting` → POST /api/prospects/[id]/events (real Zoho Event record)
 * everything else → POST /api/prospects/[id]/notes (Note with text.slice(0,80) as title)
 */
export async function logActivity(
  prospectId: string,
  text: string,
  type: ActivityType,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Activity text is required.");

  if (type === "call") {
    const res = await fetch(`/api/prospects/${prospectId}/calls`, {
      method:      "POST",
      headers:     { "Content-Type": "application/json" },
      credentials: "same-origin",
      body:        JSON.stringify({
        subject:     trimmed.slice(0, 80),
        description: trimmed,
        callType:    "Outbound",
        status:      "Completed",
      }),
    });
    if (!res.ok) throw new Error(await extractError(res, "Failed to log call."));
    return;
  }

  if (type === "meeting") {
    const res = await fetch(`/api/prospects/${prospectId}/events`, {
      method:      "POST",
      headers:     { "Content-Type": "application/json" },
      credentials: "same-origin",
      body:        JSON.stringify({
        title:       trimmed.slice(0, 80),
        description: trimmed,
      }),
    });
    if (!res.ok) throw new Error(await extractError(res, "Failed to log meeting."));
    return;
  }

  // note, email, text_message, linkedin_message, whatsapp, document_sent,
  // document_received, stage_change, reassignment — all land in Notes.
  const res = await fetch(`/api/prospects/${prospectId}/notes`, {
    method:      "POST",
    headers:     { "Content-Type": "application/json" },
    credentials: "same-origin",
    body:        JSON.stringify({
      title:   trimmed.slice(0, 80),
      content: trimmed,
    }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to log activity."));
}

/**
 * Update the prospect's Next Action fields in Zoho.
 * `detail` is the text; empty string clears the field.
 * `isoDate` is YYYY-MM-DD or null to clear.
 */
export async function updateNextAction(
  prospectId: string,
  detail: string,
  isoDate: string | null,
): Promise<void> {
  const body: Record<string, unknown> = {
    Next_Action:      detail || null,
    Next_Action_Date: isoDate || null,
  };
  const res = await fetch(`/api/prospects/${prospectId}`, {
    method:      "PUT",
    headers:     { "Content-Type": "application/json" },
    credentials: "same-origin",
    body:        JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to update next action."));
}

/**
 * Set the prospect's Pipeline_Stage to an explicit Zoho picklist label.
 * Use this when the caller already knows the target stage.
 */
export async function setProspectStage(
  prospectId: string,
  stageZohoLabel: string,
): Promise<void> {
  const res = await fetch(`/api/prospects/${prospectId}`, {
    method:      "PUT",
    headers:     { "Content-Type": "application/json" },
    credentials: "same-origin",
    body:        JSON.stringify({ Pipeline_Stage: stageZohoLabel }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to change stage."));
}

/**
 * Advance a prospect's Pipeline_Stage one step forward along the linear
 * progression in PROSPECT_PROGRESSION_STAGES. Throws if the prospect is in a
 * special stage (Nurture / Dead / Lost) or already at the end of the
 * progression (Funded).
 */
export async function advanceProspectStage(
  prospectId: string,
  currentLocalStage: PipelineStage | null,
): Promise<{ from: string; to: string }> {
  if (!currentLocalStage) throw new Error("Prospect has no stage to advance from.");

  const currentZoho = STAGE_ENUM_TO_ZOHO[currentLocalStage];
  const currentIdx  = PROSPECT_PROGRESSION_STAGES.findIndex(s => s.value === currentZoho);

  if (currentIdx < 0) {
    throw new Error(`${currentZoho} is a special stage and cannot be advanced.`);
  }
  if (currentIdx >= PROSPECT_PROGRESSION_STAGES.length - 1) {
    throw new Error("Already at the final stage.");
  }

  const nextZoho = PROSPECT_PROGRESSION_STAGES[currentIdx + 1].value;

  const res = await fetch(`/api/prospects/${prospectId}`, {
    method:      "PUT",
    headers:     { "Content-Type": "application/json" },
    credentials: "same-origin",
    body:        JSON.stringify({ Pipeline_Stage: nextZoho }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to advance stage."));

  return { from: currentZoho, to: nextZoho };
}
