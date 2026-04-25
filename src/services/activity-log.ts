/**
 * Domain service for the commitment lifecycle + unified activity log.
 *
 * Policy lives here (e.g. "opening a commitment also updates the Prospect
 * denormalization fields"; "fulfilling a commitment sets `Fulfills_Commitment`
 * on the fulfilling touch row"). All calls go through the Zoho client layer
 * at `src/lib/zoho/activity-log.ts`.
 */

import { zohoApi } from "@/lib/zoho/api-client";
import {
  createActivityLog,
  updateActivityLog,
  listOpenCommitments,
  listAllOpenOverdueCommitments,
  listProspectActivityLogs,
} from "@/lib/zoho/activity-log";
import { getTodayCT } from "@/lib/format";
import type { ActivityType } from "@/lib/types";
import type { ZohoActivityLog, ZohoCommitmentStatus } from "@/types";

// ─── Auto close-out matching (type-based) ────────────────────────────────────

/**
 * Commitment_Type → activity types that count as fulfilling it.
 * "any" = any non-note touch fulfills (Follow-up = generic).
 * []    = never auto-fulfills (Other = requires explicit close).
 */
const COMMITMENT_MATCHES: Record<string, ActivityType[] | "any"> = {
  Call:        ["call"],
  Email:       ["email"],
  Meeting:     ["meeting"],
  Document:    ["document_sent", "document_received"],
  "Follow-up": "any",
  Other:       [],
};

function activityMatchesCommitment(
  commitmentType: string | null | undefined,
  activityType:   ActivityType,
): boolean {
  const rule = COMMITMENT_MATCHES[commitmentType ?? ""];
  if (rule === "any") return true;
  if (!rule) return false;
  return rule.includes(activityType);
}

// ─── Activity type translation (app enum → Zoho Activity_Type value) ─────────

/**
 * App-side activity keys are snake_case (`text_message`, `stage_change`, …);
 * Zoho's `Activity_Type` picklist uses `Text_Message`, `Stage_Change`, etc.
 * Same slot, different casing — this is a 1:1 mapping with no information loss.
 */
const APP_TO_ZOHO_ACTIVITY_TYPE: Record<ActivityType, string> = {
  call:               "Call",
  email:              "Email",
  meeting:            "Meeting",
  note:               "Note",
  text_message:       "Text_Message",
  linkedin_message:   "LinkedIn_Message",
  whatsapp:           "WhatsApp",
  stage_change:       "Stage_Change",
  document_sent:      "Document_Sent",
  document_received:  "Document_Received",
  reassignment:       "Reassignment",
};

export function activityTypeToZoho(type: ActivityType): string {
  return APP_TO_ZOHO_ACTIVITY_TYPE[type];
}

// ─── Touch activities ────────────────────────────────────────────────────────

export type LogTouchInput = {
  type:                  ActivityType;
  date?:                 string;                           // defaults to today CT
  description:           string;
  outcome?:              "connected" | "attempted" | null;
  fulfillsCommitmentId?: string | null;
};

/** Write one non-commitment Activity_Log row. Returns its id. */
export async function logTouchActivity(
  accessToken: string,
  prospectId:  string,
  input:       LogTouchInput,
): Promise<string> {
  const zohoType = activityTypeToZoho(input.type);
  return createActivityLog(accessToken, {
    prospectId,
    activityType:         zohoType,
    activityDate:         input.date ?? getTodayCT(),
    description:          input.description,
    outcome:              input.outcome ?? null,
    fulfillsCommitmentId: input.fulfillsCommitmentId ?? null,
    name:                 zohoType,
  });
}

// ─── Commitments ─────────────────────────────────────────────────────────────

export type OpenCommitmentInput = {
  type:    string;        // one of NEXT_ACTION_TYPES keys (verbatim Zoho value)
  detail:  string;
  dueDate: string;        // "YYYY-MM-DD"
};

/**
 * Create a new `Commitment_Set` row on Activity_Log and mirror the detail + due
 * date onto the Prospect's `Next_Action` / `Next_Action_Date` fields as the
 * denormalized "current commitment" for Zoho-native views.
 *
 * Callers that want supersede-on-edit semantics should call
 * `closeCommitment(..., "superseded")` on any prior open row first.
 */
export async function openCommitment(
  accessToken: string,
  prospectId:  string,
  input:       OpenCommitmentInput,
): Promise<string> {
  const today = getTodayCT();
  const id = await createActivityLog(accessToken, {
    prospectId,
    activityType:      "Commitment_Set",
    activityDate:      today,
    commitmentType:    input.type,
    commitmentDetail:  input.detail,
    commitmentDueDate: input.dueDate,
    commitmentStatus:  "open",
    name:              `Next action: ${input.detail.slice(0, 60)}`,
  });

  // Denormalize current commitment onto Prospect for Zoho native views.
  // Non-blocking: if it fails, the Activity_Log row is still the truth.
  try {
    await zohoApi.put(accessToken, `/Prospect/${prospectId}`, {
      data: [{ Next_Action: input.detail, Next_Action_Date: input.dueDate }],
    });
  } catch {
    /* denormalization best-effort */
  }

  return id;
}

/**
 * Close an open commitment. Terminal states:
 *   fulfilled  — the activity at `fulfilledByActivityId` handled it
 *   superseded — the plan changed (new commitment replaces it)
 *   cancelled  — prospect was dropped or explicitly cancelled
 *
 * When transitioning to `fulfilled` and a fulfilling activity id is provided,
 * the fulfilling row's `Fulfills_Commitment` lookup is set in the same call.
 */
export async function closeCommitment(
  accessToken:  string,
  commitmentId: string,
  status:       Exclude<ZohoCommitmentStatus, "open">,
  fulfilledByActivityId?: string | null,
): Promise<void> {
  const today = getTodayCT();
  await updateActivityLog(accessToken, commitmentId, {
    commitmentStatus:     status,
    commitmentClosedDate: today,
  });

  if (status === "fulfilled" && fulfilledByActivityId) {
    try {
      await updateActivityLog(accessToken, fulfilledByActivityId, {
        fulfillsCommitmentId: commitmentId,
      });
    } catch {
      // Linkage is informational — log a warning but don't roll back the close.
      console.warn(`Failed to link fulfiller ${fulfilledByActivityId} → commitment ${commitmentId}`);
    }
  }
}

export type AutoCloseResult =
  | { closed: "fulfilled" | "cancelled"; commitmentId: string }
  | { closed: null };

/**
 * After a touch activity is logged, auto-transition the (single) open
 * commitment based on type match. Rules:
 *   - note / stage_change / reassignment → no-op (neutral)
 *   - outcome = "attempted"              → no-op (call not done properly)
 *   - type matches commitment            → fulfilled, back-linked to activity
 *   - type mismatches                    → cancelled
 *
 * System invariant: at most one open commitment per prospect.
 */
export async function autoCloseOutOnActivity(
  accessToken:  string,
  prospectId:   string,
  activityId:   string,
  activityType: ActivityType,
  outcome:      "connected" | "attempted" | null,
): Promise<AutoCloseResult> {
  if (activityType === "note")         return { closed: null };
  if (activityType === "stage_change") return { closed: null };
  if (activityType === "reassignment") return { closed: null };
  if (outcome === "attempted")         return { closed: null };

  const open = await listOpenCommitments(accessToken, prospectId);
  if (open.length === 0) return { closed: null };

  const commitment = open[0];
  const matches = activityMatchesCommitment(commitment.Commitment_Type, activityType);

  if (matches) {
    await closeCommitment(accessToken, commitment.id, "fulfilled", activityId);
  } else {
    await closeCommitment(accessToken, commitment.id, "cancelled");
  }

  // Clear the Prospect-level Next_Action denormalization — otherwise the
  // bar keeps showing the just-closed commitment's detail. If the user
  // confirms a new commitment in the Next Action prompt, openCommitment()
  // overwrites these fields with the new values.
  try {
    await zohoApi.put(accessToken, `/Prospect/${prospectId}`, {
      data: [{ Next_Action: null, Next_Action_Date: null }],
    });
  } catch {
    /* denormalization cleanup best-effort */
  }

  return {
    closed:       matches ? "fulfilled" : "cancelled",
    commitmentId: commitment.id,
  };
}

/** Cancel every still-`open` commitment on a prospect (used by Drop lead). */
export async function clearOpenCommitments(
  accessToken: string,
  prospectId:  string,
): Promise<number> {
  const open = await listOpenCommitments(accessToken, prospectId);
  await Promise.all(
    open.map((row) => closeCommitment(accessToken, row.id, "cancelled")),
  );
  return open.length;
}

/** Read helpers re-exported for service consumers. */
export async function getOpenCommitments(
  accessToken: string,
  prospectId:  string,
): Promise<ZohoActivityLog[]> {
  return listOpenCommitments(accessToken, prospectId);
}

export async function getProspectActivityLog(
  accessToken: string,
  prospectId:  string,
): Promise<ZohoActivityLog[]> {
  return listProspectActivityLogs(accessToken, prospectId);
}

/**
 * Org-wide set of prospect ids that currently have ≥1 open commitment due
 * on/before today. Drives the dashboard overdue queue and list-view
 * enrichment.
 */
export async function getOverdueProspectIdSet(
  accessToken: string,
): Promise<Set<string>> {
  const rows = await listAllOpenOverdueCommitments(accessToken, getTodayCT());
  const ids  = new Set<string>();
  for (const r of rows) {
    if (r.Prospect?.id) ids.add(r.Prospect.id);
  }
  return ids;
}
