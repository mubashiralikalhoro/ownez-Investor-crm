/**
 * Zoho client for the custom `Activity_Log` module.
 *
 * Every row represents one event (touch or commitment) tied to a Prospect.
 * See `src/types/index.ts::ZohoActivityLog` for the row shape and
 * `.claude/plans/remaining-work-add-transient-wirth.md` for the lifecycle
 * rules around `Commitment_Status`.
 *
 * This module only wraps HTTP — policy (e.g. "superseding an open
 * commitment when the bar is edited") lives in `src/services/activity-log.ts`.
 */

import { AxiosError } from "axios";
import { zohoApi } from "@/lib/zoho/api-client";
import type {
  ZohoActivityLog,
  ZohoCommitmentStatus,
} from "@/types";

// ─── Response shapes ─────────────────────────────────────────────────────────

type ZohoWriteResponse = {
  data?: Array<{
    code: string;
    status: string;
    message?: string;
    details?: { id?: string };
  }>;
};

type ZohoListResponse = {
  data?: ZohoActivityLog[];
  info?: {
    more_records?: boolean;
    next_page_token?: string | null;
  };
};

// ─── Error helper (scoped copy — services/prospects.ts has a richer one) ─────

function throwZohoError(label: string, err: unknown): never {
  if (err instanceof AxiosError) {
    const body = err.response?.data as
      | { message?: string; code?: string; data?: Array<{ code?: string; message?: string; details?: unknown }> }
      | undefined;
    const inner = body?.data?.[0];
    const msg   = inner?.message ?? body?.message ?? err.message;
    const code  = inner?.code    ?? body?.code    ?? "UNKNOWN";
    throw new Error(`${label} (${err.response?.status ?? "network"}): [${code}] ${msg}`);
  }
  throw err;
}

// ─── Create ──────────────────────────────────────────────────────────────────

export type CreateActivityLogInput = {
  prospectId:           string;
  activityType:         string;                 // Zoho picklist API value, exact
  activityDate:         string;                 // "YYYY-MM-DD"
  description?:         string | null;
  outcome?:             "connected" | "attempted" | null;
  fulfillsCommitmentId?: string | null;
  commitmentType?:      string | null;
  commitmentDetail?:    string | null;
  commitmentDueDate?:   string | null;
  commitmentStatus?:    ZohoCommitmentStatus | null;
  commitmentClosedDate?: string | null;
  name?:                string | null;          // display name for Zoho UI
};

/** POST /crm/v8/Activity_Log — returns the new row's id. */
export async function createActivityLog(
  accessToken: string,
  input:       CreateActivityLogInput,
): Promise<string> {
  const payload: Record<string, unknown> = {
    Prospect:      { id: input.prospectId },
    Activity_Type: input.activityType,
    Activity_Date: input.activityDate,
  };
  if (input.name !== undefined)                 payload.Name                   = input.name;
  if (input.description !== undefined)          payload.Description            = input.description;
  if (input.outcome !== undefined)              payload.Outcome                = input.outcome;
  if (input.fulfillsCommitmentId !== undefined) payload.Fulfills_Commitment    = input.fulfillsCommitmentId ? { id: input.fulfillsCommitmentId } : null;
  if (input.commitmentType !== undefined)       payload.Commitment_Type        = input.commitmentType;
  if (input.commitmentDetail !== undefined)     payload.Commitment_Detail      = input.commitmentDetail;
  if (input.commitmentDueDate !== undefined)    payload.Commitment_Due_Date    = input.commitmentDueDate;
  if (input.commitmentStatus !== undefined)     payload.Commitment_Status      = input.commitmentStatus;
  if (input.commitmentClosedDate !== undefined) payload.Commitment_Closed_Date = input.commitmentClosedDate;

  try {
    const { data: json } = await zohoApi.post<ZohoWriteResponse>(
      accessToken,
      "/Activity_Log",
      { data: [payload] },
    );
    const row = json.data?.[0];
    if (row?.status !== "success" || !row.details?.id) {
      throw new Error(`Activity_Log create failed: [${row?.code ?? "UNKNOWN"}] ${row?.message ?? ""}`);
    }
    return row.details.id;
  } catch (err) {
    throwZohoError("Activity_Log create", err);
  }
}

// ─── Update (partial) ────────────────────────────────────────────────────────

export type UpdateActivityLogInput = Partial<{
  activityType:         string;
  activityDate:         string;
  description:          string | null;
  outcome:              "connected" | "attempted" | null;
  fulfillsCommitmentId: string | null;
  commitmentType:       string | null;
  commitmentDetail:     string | null;
  commitmentDueDate:    string | null;
  commitmentStatus:     ZohoCommitmentStatus | null;
  commitmentClosedDate: string | null;
  name:                 string | null;
}>;

/** PUT /crm/v8/Activity_Log/{id} — only the provided fields are sent. */
export async function updateActivityLog(
  accessToken: string,
  id:          string,
  patch:       UpdateActivityLogInput,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.activityType !== undefined)         payload.Activity_Type          = patch.activityType;
  if (patch.activityDate !== undefined)         payload.Activity_Date          = patch.activityDate;
  if (patch.description !== undefined)          payload.Description            = patch.description;
  if (patch.outcome !== undefined)              payload.Outcome                = patch.outcome;
  if (patch.fulfillsCommitmentId !== undefined) payload.Fulfills_Commitment    = patch.fulfillsCommitmentId ? { id: patch.fulfillsCommitmentId } : null;
  if (patch.commitmentType !== undefined)       payload.Commitment_Type        = patch.commitmentType;
  if (patch.commitmentDetail !== undefined)     payload.Commitment_Detail      = patch.commitmentDetail;
  if (patch.commitmentDueDate !== undefined)    payload.Commitment_Due_Date    = patch.commitmentDueDate;
  if (patch.commitmentStatus !== undefined)     payload.Commitment_Status      = patch.commitmentStatus;
  if (patch.commitmentClosedDate !== undefined) payload.Commitment_Closed_Date = patch.commitmentClosedDate;
  if (patch.name !== undefined)                 payload.Name                   = patch.name;

  try {
    const { data: json } = await zohoApi.put<ZohoWriteResponse>(
      accessToken,
      `/Activity_Log/${id}`,
      { data: [payload] },
    );
    const row = json.data?.[0];
    if (row?.status !== "success") {
      throw new Error(`Activity_Log update failed: [${row?.code ?? "UNKNOWN"}] ${row?.message ?? ""}`);
    }
  } catch (err) {
    throwZohoError("Activity_Log update", err);
  }
}

// ─── Search / list ───────────────────────────────────────────────────────────

/**
 * Page through /crm/v8/Activity_Log/search with the given criteria string.
 * Walks every page up to a safety cap so callers don't need to paginate.
 */
async function searchAll(
  accessToken: string,
  criteria:    string,
  opts:        { perPage?: number; maxPages?: number } = {},
): Promise<ZohoActivityLog[]> {
  const perPage  = opts.perPage  ?? 200;
  const maxPages = opts.maxPages ?? 50;
  const all: ZohoActivityLog[] = [];

  let page = 1;
  while (page <= maxPages) {
    try {
      const { data: json } = await zohoApi.get<ZohoListResponse>(
        accessToken,
        "/Activity_Log/search",
        {
          criteria,
          per_page: perPage,
          page,
        },
      );
      const rows = json.data ?? [];
      all.push(...rows);
      if (!json.info?.more_records) break;
      page++;
    } catch (err) {
      // Zoho returns 204 (empty) as an axios error on some deployments; treat
      // no matches as an empty list rather than a failure.
      if (err instanceof AxiosError && err.response?.status === 204) return all;
      throwZohoError("Activity_Log search", err);
    }
  }
  return all;
}

/** All Activity_Log rows for one prospect, newest first. */
export async function listProspectActivityLogs(
  accessToken: string,
  prospectId:  string,
): Promise<ZohoActivityLog[]> {
  return searchAll(accessToken, `(Prospect:equals:${prospectId})`);
}

/** Open commitments for one prospect (any due date). */
export async function listOpenCommitments(
  accessToken: string,
  prospectId:  string,
): Promise<ZohoActivityLog[]> {
  return searchAll(
    accessToken,
    `((Prospect:equals:${prospectId})and(Activity_Type:equals:Commitment_Set)and(Commitment_Status:equals:open))`,
  );
}

/**
 * Org-wide: every open commitment due on or before `today`. Used by the
 * dashboard overdue queue to stamp prospects with `hasOverdueOpenCommitment`
 * in a single call.
 */
export async function listAllOpenOverdueCommitments(
  accessToken: string,
  today:       string,          // "YYYY-MM-DD"
): Promise<ZohoActivityLog[]> {
  return searchAll(
    accessToken,
    `((Activity_Type:equals:Commitment_Set)and(Commitment_Status:equals:open)and(Commitment_Due_Date:less_equal:${today}))`,
  );
}
