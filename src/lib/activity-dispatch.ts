/**
 * Client-side dispatcher for logging activities and managing commitments.
 *
 * Calls the Next.js API routes — which in turn call Zoho via the service layer.
 * No silent fallbacks: failures throw with the Zoho error message so the UI can
 * surface them.
 */

import type { ActivityType, PipelineStage } from "@/lib/types";
import type { ZohoActivityLog, ZohoCommitmentStatus } from "@/types";
import { PROSPECT_PROGRESSION_STAGES } from "@/lib/prospect-config";

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

// ─── Touch activities ────────────────────────────────────────────────────────

export type LogActivityOptions = {
  outcome?:             "connected" | "attempted" | null;
  date?:                string;
  fulfillsCommitmentId?: string | null;
};

/**
 * Log any touch activity against a prospect. Returns the new Activity_Log row id.
 */
export async function logActivity(
  prospectId: string,
  text:       string,
  type:       ActivityType,
  opts:       LogActivityOptions = {},
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Activity text is required.");

  const body: Record<string, unknown> = {
    type,
    description: trimmed,
  };
  if (opts.outcome             != null) body.outcome              = opts.outcome;
  if (opts.date)                        body.date                 = opts.date;
  if (opts.fulfillsCommitmentId != null) body.fulfillsCommitmentId = opts.fulfillsCommitmentId;

  const res = await fetch(`/api/prospects/${prospectId}/activities`, {
    method:      "POST",
    headers:     { "Content-Type": "application/json" },
    credentials: "same-origin",
    body:        JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to log activity."));

  const json = await res.json() as { data?: { id?: string } };
  const id = json.data?.id;
  if (!id) throw new Error("Activity logged but no id returned.");
  return id;
}

// ─── Commitments ─────────────────────────────────────────────────────────────

/**
 * Open a new commitment (replaces the old updateNextAction that only wrote
 * Prospect.Next_Action + Next_Action_Date). Returns the new commitment row id.
 */
export async function openCommitment(
  prospectId: string,
  type:       string,
  detail:     string,
  dueDate:    string,
): Promise<string> {
  const res = await fetch(`/api/prospects/${prospectId}/commitments`, {
    method:      "POST",
    headers:     { "Content-Type": "application/json" },
    credentials: "same-origin",
    body:        JSON.stringify({ type, detail, dueDate }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to set next action."));

  const json = await res.json() as { data?: { id?: string } };
  const id = json.data?.id;
  if (!id) throw new Error("Commitment created but no id returned.");
  return id;
}

/** Transition an open commitment to fulfilled / superseded / cancelled. */
export async function closeCommitment(
  prospectId:            string,
  commitmentId:          string,
  status:                Exclude<ZohoCommitmentStatus, "open">,
  fulfilledByActivityId?: string | null,
): Promise<void> {
  const body: Record<string, unknown> = { status };
  if (fulfilledByActivityId) body.fulfilledByActivityId = fulfilledByActivityId;

  const res = await fetch(
    `/api/prospects/${prospectId}/commitments/${commitmentId}`,
    {
      method:      "PATCH",
      headers:     { "Content-Type": "application/json" },
      credentials: "same-origin",
      body:        JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(await extractError(res, "Failed to close commitment."));
}

/** Fetch all open commitments for a prospect. */
export async function getOpenCommitments(
  prospectId: string,
): Promise<ZohoActivityLog[]> {
  const res = await fetch(`/api/prospects/${prospectId}/commitments`, {
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(await extractError(res, "Failed to fetch commitments."));
  const json = await res.json() as { data?: ZohoActivityLog[] };
  return json.data ?? [];
}

// ─── Drop lead ───────────────────────────────────────────────────────────────

export type DropLeadOptions =
  | { mode: "Dead";    lostReason: string; note?: string }
  | { mode: "Nurture"; reEngageDate: string; note?: string };

/**
 * Drop a prospect to Dead/Nurture:
 *   1. (Optional) log a stage-change note.
 *   2. Set Pipeline_Stage + reason/re-engage date on the Prospect record.
 *   3. Cancel all open commitments via the commitments API.
 */
export async function dropLead(
  prospectId: string,
  opts:       DropLeadOptions,
): Promise<void> {
  const stageLabel = opts.mode === "Dead" ? "Dead / Lost" : "Nurture";

  // 1. Log stage-change touch
  const noteText =
    opts.mode === "Dead"
      ? `Stage changed to Dead/Lost. Reason: ${opts.lostReason}.${opts.note ? " " + opts.note : ""}`
      : `Stage changed to Nurture. Re-engage: ${opts.reEngageDate}.${opts.note ? " " + opts.note : ""}`;

  await logActivity(prospectId, noteText, "stage_change");

  // 2. Update Prospect stage + extra fields
  const prospectUpdate: Record<string, unknown> = { Pipeline_Stage: stageLabel };
  if (opts.mode === "Dead") {
    prospectUpdate.Lost_Dead_Reason = opts.lostReason;
  } else {
    prospectUpdate.Next_Action_Date = opts.reEngageDate;
  }
  const stageRes = await fetch(`/api/prospects/${prospectId}`, {
    method:      "PUT",
    headers:     { "Content-Type": "application/json" },
    credentials: "same-origin",
    body:        JSON.stringify(prospectUpdate),
  });
  if (!stageRes.ok) throw new Error(await extractError(stageRes, "Failed to update prospect stage."));

  // 3. Cancel open commitments
  const openCommitments = await getOpenCommitments(prospectId);
  await Promise.all(
    openCommitments.map((c) => closeCommitment(prospectId, c.id, "cancelled")),
  );
}

// ─── Stage helpers ───────────────────────────────────────────────────────────

export async function setProspectStage(
  prospectId:     string,
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

export async function advanceProspectStage(
  prospectId:        string,
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
