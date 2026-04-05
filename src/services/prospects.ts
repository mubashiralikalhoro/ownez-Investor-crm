import { AxiosError } from "axios";
import { zohoApi } from "@/lib/zoho/api-client";
import type {
  ProspectFilters,
  ProspectsListResult,
  ZohoPaginationInfo,
  ZohoProspect,
  ZohoProspectDetail,
  ZohoNote,
  ZohoTimelineEvent,
  ZohoEmail,
  ZohoCall,
  ZohoEvent,
  ZohoStageHistory,
  ZohoAttachment,
  ZohoTask,
  ZohoFundedRecord,
} from "@/types";

/** Fields to request from the Prospects module. */
const PROSPECT_FIELDS = [
  "id",
  "Name",
  "Email",
  "Phone",
  "Owner",
  "Pipeline_Stage",
  "Lead_Source",
  "Next_Action",
  "Next_Action_Date",
  "Days_Since_Last_Touch",
  "Stale_Flag",
  "Initial_Investment_Target",
  "Committed_Amount",
  "Growth_Target",
  "Company_Entity",
].join(",");

type ZohoListApiResponse = {
  data?: ZohoProspect[];
  info?: ZohoPaginationInfo;
  code?: string;
  message?: string;
  status?: string;
};

// ─── Allowlists for criteria injection protection ─────────────────────────────

/** Valid Zoho CRM Pipeline_Stage picklist labels. */
const VALID_PIPELINE_STAGES = new Set([
  "Prospect", "Initial Contact", "Discovery", "Pitch", "Active Engagement",
  "Soft Commit", "Commitment Processing", "KYC / Docs", "Funded", "Nurture", "Dead / Lost",
]);

/** Valid Zoho CRM Lead_Source picklist labels. */
const VALID_LEAD_SOURCES = new Set([
  "Velocis Network", "CPA Referral", "Legacy Event", "LinkedIn", "Ken - DBJ List",
  "Ken - Event Follow-up", "Tolleson WM", "M&A Attorney", "Cold Outreach", "Other",
]);

/** Zoho CRM record IDs are numeric strings. */
const ZOHO_ID_RE = /^\d+$/;

/**
 * Build Zoho criteria string from filter fields.
 * All values are validated against allowlists before interpolation to prevent
 * criteria injection (crafted values that break out of the clause and inject new conditions).
 * Invalid values are silently ignored — the filter simply isn't applied.
 */
function buildCriteria(filters: ProspectFilters): string | undefined {
  const parts: string[] = [];

  if (filters.pipelineStage && VALID_PIPELINE_STAGES.has(filters.pipelineStage)) {
    parts.push(`(Pipeline_Stage:equals:${filters.pipelineStage})`);
  }
  if (filters.leadSource && VALID_LEAD_SOURCES.has(filters.leadSource)) {
    parts.push(`(Lead_Source:equals:${filters.leadSource})`);
  }
  if (filters.ownerId && ZOHO_ID_RE.test(filters.ownerId)) {
    parts.push(`(Owner:equals:${filters.ownerId})`);
  }
  if (filters.excludeFunded) {
    parts.push(`(Pipeline_Stage:not_equal:Funded)`);
  }

  if (parts.length === 0) return undefined;
  return parts.length === 1 ? parts[0] : `(${parts.join("and")})`;
}

/**
 * Fetch a paginated list of Prospects from Zoho CRM v8.
 * Filters, sorting, and search are applied server-side via Zoho's API.
 *
 * - No filters / no search → GET /Prospects (list endpoint, fastest)
 * - Any filter or search   → GET /Prospects/search (criteria + word)
 *
 * @param accessToken  Zoho OAuth access token.
 * @param page         1-based page number.
 * @param pageSize     Records per page (max 200).
 * @param filters      Server-side filters, sort, and search.
 */
export async function getProspectsList(
  accessToken: string,
  page: number = 1,
  pageSize: number = 200,
  filters: ProspectFilters = {}
): Promise<ProspectsListResult> {
  const clampedPage = Math.max(1, page);
  const clampedPageSize = Math.min(200, Math.max(1, pageSize));

  // Zoho requires at least 2 characters for word search — ignore shorter terms.
  const searchWord = (filters.search?.trim() ?? "").length >= 2 ? filters.search!.trim() : undefined;
  const hasSearch = Boolean(searchWord);

  // Zoho /search does NOT support word + criteria simultaneously.
  // When a word search is active we send only `word` and filter client-side.
  // When there is no word search we can safely use criteria.
  const criteria = hasSearch ? undefined : buildCriteria(filters);
  const useSearchEndpoint = hasSearch || Boolean(criteria);

  const endpoint = useSearchEndpoint ? "/Prospect/search" : "/Prospect";

  const params: Record<string, string | number> = {
    fields: PROSPECT_FIELDS,
    page: clampedPage,
    per_page: clampedPageSize,
  };

  if (hasSearch && searchWord) params.word = searchWord;
  if (criteria) params.criteria = criteria;

  try {
    const { data: json } = await zohoApi.get<ZohoListApiResponse>(accessToken, endpoint, params);

    // Zoho returns HTTP 200 with { status: "error" } on logical errors.
    if (json.status === "error" || json.code) {
      throw new Error(
        `Zoho Prospects API error: [${json.code ?? "UNKNOWN"}] ${json.message ?? "Unknown error"}`
      );
    }

    // When a word search was active we couldn't use criteria, so apply
    // any remaining filters (e.g. excludeFunded) on the returned records.
    let records = json.data ?? [];
    if (hasSearch) {
      if (filters.excludeFunded) records = records.filter(r => r.Pipeline_Stage !== "Funded");
      if (filters.pipelineStage) records = records.filter(r => r.Pipeline_Stage === filters.pipelineStage);
      if (filters.leadSource)    records = records.filter(r => r.Lead_Source    === filters.leadSource);
      if (filters.ownerId)       records = records.filter(r => r.Owner?.id      === filters.ownerId);
    }

    return {
      data: records,
      info: json.info ?? {
        page: clampedPage,
        per_page: clampedPageSize,
        count: json.data?.length ?? 0,
        more_records: false,
        sort_by: "id",
        sort_order: "desc",
        next_page_token: null,
        previous_page_token: null,
        page_token_expiry: null,
      },
    };
  } catch (err) {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const body = err.response?.data as { message?: string; code?: string } | undefined;
      const detail = body?.message ?? body?.code ?? err.message;
      throw new Error(`Zoho Prospects API error (${status ?? "network"}): ${detail}`);
    }
    throw err;
  }
}

// ─── Dashboard recent activity (global Notes) ────────────────────────────────

/**
 * Fetches the most recent Notes across ALL Prospect records.
 * Uses the top-level /Notes endpoint (not scoped to a single prospect) so
 * we get a global recent-activity feed without fetching every prospect.
 *
 * Custom query:
 *   GET /Notes?fields=id,Note_Title,Note_Content,Created_Time,Created_By,Parent_Id
 *              &sort_by=Created_Time&sort_order=desc&per_page={limit}
 */
export type ZohoNoteWithParent = ZohoNote & {
  Parent_Id: {
    name: string;
    id: string;
    module: { api_name: string; id: string };
  } | null;
};

export async function getRecentActivityNotes(
  accessToken: string,
  limit: number = 20
): Promise<ZohoNoteWithParent[]> {
  try {
    const { data: json } = await zohoApi.get<{ data?: ZohoNoteWithParent[] }>(
      accessToken,
      "/Notes",
      {
        fields: "id,Note_Title,Note_Content,Created_Time,Created_By,Parent_Id",
        sort_by: "Created_Time",
        sort_order: "desc",
        per_page: Math.min(limit, 50),
      }
    );
    // Only keep notes that belong to Prospect records
    const all = json.data ?? [];
    return all.filter(
      n => !n.Parent_Id || n.Parent_Id.module?.api_name === "Prospect"
    );
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 204) return [];
    // If sort_by is unsupported, retry without it
    if (err instanceof AxiosError && err.response?.status === 400) {
      const { data: json2 } = await zohoApi.get<{ data?: ZohoNoteWithParent[] }>(
        accessToken,
        "/Notes",
        {
          fields: "id,Note_Title,Note_Content,Created_Time,Created_By,Parent_Id",
          per_page: Math.min(limit, 50),
        }
      );
      const all = json2.data ?? [];
      return all.filter(
        n => !n.Parent_Id || n.Parent_Id.module?.api_name === "Prospect"
      );
    }
    wrapZohoError("Zoho recent activity notes error", err);
  }
}

// ─── Global recent Calls ─────────────────────────────────────────────────────

/**
 * GET /Calls — recent calls across the whole CRM.
 * Falls back silently on sort errors or permission issues so the activity feed
 * still shows notes/events even if calls can't be fetched.
 */
export async function getRecentCalls(
  accessToken: string,
  limit: number = 10
): Promise<ZohoCall[]> {
  const fields =
    "id,Subject,Call_Type,Call_Status,Description,Call_Start_Time,Created_Time,Created_By,Who_Id";

  const tryFetch = async (params: Record<string, string | number>) => {
    const { data: json } = await zohoApi.get<{ data?: ZohoCall[] }>(
      accessToken, "/Calls", params
    );
    return json.data ?? [];
  };

  try {
    return await tryFetch({
      fields, sort_by: "Created_Time", sort_order: "desc",
      per_page: Math.min(limit, 50),
    });
  } catch (err) {
    if (err instanceof AxiosError) {
      if (err.response?.status === 204) return [];
      // Retry without sort if that was the problem
      if (err.response?.status === 400) {
        try { return await tryFetch({ fields, per_page: Math.min(limit, 50) }); }
        catch { return []; }
      }
    }
    return []; // any other error — don't break the whole feed
  }
}

// ─── Global recent Events ─────────────────────────────────────────────────────

/**
 * GET /Events — recent meetings/events across the whole CRM.
 * Same silent-fallback approach as getRecentCalls.
 */
export async function getRecentEvents(
  accessToken: string,
  limit: number = 8
): Promise<ZohoEvent[]> {
  const fields =
    "id,Event_Title,Start_DateTime,End_DateTime,Description,Created_Time,Created_By,Owner";

  const tryFetch = async (params: Record<string, string | number>) => {
    const { data: json } = await zohoApi.get<{ data?: ZohoEvent[] }>(
      accessToken, "/Events", params
    );
    return json.data ?? [];
  };

  try {
    return await tryFetch({
      fields, sort_by: "Created_Time", sort_order: "desc",
      per_page: Math.min(limit, 50),
    });
  } catch (err) {
    if (err instanceof AxiosError) {
      if (err.response?.status === 204) return [];
      if (err.response?.status === 400) {
        try { return await tryFetch({ fields, per_page: Math.min(limit, 50) }); }
        catch { return []; }
      }
    }
    return [];
  }
}

// ─── Shared write-response helper type ───────────────────────────────────────

type ZohoWriteResponse = {
  data?: Array<{
    code: string;
    status: string;
    message?: string;
    details?: Record<string, unknown>;
  }>;
};

// ─── Update Prospect ─────────────────────────────────────────────────────────

/**
 * PUT /Prospect/{id} — patch one or more fields on an existing Prospect record.
 * Only the keys present in `fields` are sent; all others are left unchanged.
 */
export async function updateProspectInZoho(
  accessToken: string,
  id: string,
  fields: Record<string, unknown>
): Promise<void> {
  const { data: json } = await zohoApi.put<ZohoWriteResponse>(
    accessToken,
    `/Prospect/${id}`,
    { data: [fields] }
  );
  const result = json.data?.[0];
  if (result?.status !== "success") {
    throw new Error(
      `Zoho prospect update failed: [${result?.code ?? "UNKNOWN"}] ${result?.message ?? ""}`
    );
  }
}

// ─── Funded Investor ──────────────────────────────────────────────────────────

/**
 * POST /Funded_Investor — create a Funded Investor record linked to a Prospect.
 *
 * Required by Zoho: Name, Prospect.id
 * Optional fields mapped from the prospect: Email, Phone, Company_Entity,
 *   Amount_Invested (← Committed_Amount), Growth_Target, Investment_Date (today).
 *
 * Returns the new record's Zoho ID.
 */
export async function createFundedInvestor(
  accessToken: string,
  prospect: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    companyEntity?: string | null;
    committedAmount?: number | null;
    growthTarget?: number | null;
    ownerId?: string | null;
  }
): Promise<string> {
  type Resp = { data?: Array<{ code: string; status: string; message?: string; details?: { id?: string } }> };

  const payload: Record<string, unknown> = {
    Name: prospect.name,
    Prospect: { id: prospect.id },
    Investment_Date: new Date().toISOString().slice(0, 10),
  };
  if (prospect.email)           payload.Email           = prospect.email;
  if (prospect.phone)           payload.Phone           = prospect.phone;
  if (prospect.companyEntity)   payload.Company_Entity  = prospect.companyEntity;
  if (prospect.committedAmount) payload.Amount_Invested = prospect.committedAmount;
  if (prospect.growthTarget)    payload.Growth_Target   = prospect.growthTarget;
  if (prospect.ownerId)         payload.Owner           = { id: prospect.ownerId };

  const { data: json } = await zohoApi.post<Resp>(accessToken, "/Funded_Investor", { data: [payload] });
  const result = json.data?.[0];
  if (result?.status !== "success" || !result?.details?.id) {
    throw new Error(
      `Zoho Funded Investor create failed: [${result?.code ?? "UNKNOWN"}] ${result?.message ?? ""}`
    );
  }
  return result.details.id;
}

// ─── Notes CRUD ───────────────────────────────────────────────────────────────

/**
 * POST /Notes — create a note linked to a Prospect record.
 * Returns a minimal ZohoNote object (server may not echo all fields).
 */
export async function createProspectNote(
  accessToken: string,
  prospectId: string,
  title: string,
  content: string
): Promise<ZohoNote> {
  type Resp = { data?: Array<{ code: string; status: string; message?: string; details?: { id?: string } }> };
  // Zoho v8 reference format: POST /Notes with Parent_Id as a JSON object.
  // module.id (org-specific) is omitted — api_name alone is sufficient.
  const notePayload: Record<string, unknown> = {
    Note_Content: content.trim(),
    Parent_Id: {
      module: { api_name: "Prospect" },
      id: prospectId,
    },
  };
  if (title.trim()) notePayload.Note_Title = title.trim();
  const { data: json } = await zohoApi.post<Resp>(
    accessToken,
    "/Notes",
    { data: [notePayload] }
  );
  const result = json.data?.[0];
  if (result?.status !== "success" || !result?.details?.id) {
    throw new Error(
      `Zoho note create failed: [${result?.code ?? "UNKNOWN"}] ${result?.message ?? ""}`
    );
  }
  const now = new Date().toISOString();
  return {
    id: result.details.id,
    Note_Title: title.trim() || null,
    Note_Content: content.trim(),
    Created_Time: now,
    Modified_Time: now,
    Created_By: null,
    Modified_By: null,
    Owner: null,
    Parent_Id: null,
  };
}

/**
 * PUT /Notes/{noteId} — overwrite title and/or content.
 */
export async function updateProspectNote(
  accessToken: string,
  noteId: string,
  title: string,
  content: string
): Promise<void> {
  const { data: json } = await zohoApi.put<ZohoWriteResponse>(
    accessToken,
    `/Notes/${noteId}`,
    { data: [{ Note_Title: title.trim() || null, Note_Content: content.trim() }] }
  );
  const result = json.data?.[0];
  if (result?.status !== "success") {
    throw new Error(
      `Zoho note update failed: [${result?.code ?? "UNKNOWN"}] ${result?.message ?? ""}`
    );
  }
}

/**
 * DELETE /Notes/{noteId}
 */
export async function deleteProspectNote(
  accessToken: string,
  noteId: string
): Promise<void> {
  const { data: json } = await zohoApi.delete<ZohoWriteResponse>(
    accessToken,
    `/Notes/${noteId}`
  );
  const result = json.data?.[0];
  if (result?.status !== "success") {
    throw new Error(
      `Zoho note delete failed: [${result?.code ?? "UNKNOWN"}] ${result?.message ?? ""}`
    );
  }
}

// ─── Attachment delete ────────────────────────────────────────────────────────

/**
 * DELETE /Prospect/{id}/Attachments/{attachmentId}
 */
export async function deleteProspectAttachmentFromZoho(
  accessToken: string,
  prospectId: string,
  attachmentId: string
): Promise<void> {
  const { data: json } = await zohoApi.delete<ZohoWriteResponse>(
    accessToken,
    `/Prospect/${prospectId}/Attachments/${attachmentId}`
  );
  const result = json.data?.[0];
  if (result?.status !== "success") {
    throw new Error(
      `Zoho attachment delete failed: [${result?.code ?? "UNKNOWN"}] ${result?.message ?? ""}`
    );
  }
}

// ─── Create Prospect ─────────────────────────────────────────────────────────

/**
 * Internal lead-source key → Zoho picklist label (must match the CRM dropdown).
 * Unmapped keys are title-cased as a fallback.
 */
const INTERNAL_TO_ZOHO_LEAD_SOURCE: Record<string, string> = {
  velocis_network: "Velocis Network",
  cpa_referral: "CPA Referral",
  legacy_event: "Legacy Event",
  linkedin: "LinkedIn",
  ken_dbj_list: "Ken - DBJ List",
  ken_event_followup: "Ken - Event Follow-up",
  tolleson_wm: "Tolleson WM",
  ma_attorney: "M&A Attorney",
  cold_outreach: "Cold Outreach",
  other: "Other",
};

function toZohoLeadSource(key: string): string {
  return (
    INTERNAL_TO_ZOHO_LEAD_SOURCE[key] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export type CreateProspectInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  leadSourceKey: string;
  nextAction?: string | null;
  nextActionDate?: string | null;
  ownerZohoId?: string | null;
};

export type CreateProspectResult = {
  id: string;
  name: string;
};

type ZohoCreateResponse = {
  data?: Array<{
    code: string;
    status: string;
    message: string;
    details?: { id?: string };
  }>;
};

/**
 * POST /Prospect — create a single new Prospect record in Zoho CRM.
 * Always sets Pipeline_Stage to "Prospect".
 */
export async function createProspectInZoho(
  accessToken: string,
  input: CreateProspectInput
): Promise<CreateProspectResult> {
  const record: Record<string, unknown> = {
    Name: input.name.trim(),
    Pipeline_Stage: "Prospect",
    Lead_Source: toZohoLeadSource(input.leadSourceKey),
  };

  if (input.email?.trim()) record.Email = input.email.trim();
  if (input.phone?.trim()) record.Phone = input.phone.trim();
  if (input.nextAction?.trim()) record.Next_Action = input.nextAction.trim();
  if (input.nextActionDate?.trim()) record.Next_Action_Date = input.nextActionDate.trim();
  if (input.ownerZohoId?.trim()) record.Owner = { id: input.ownerZohoId.trim() };

  const { data: json } = await zohoApi.post<ZohoCreateResponse>(accessToken, "/Prospect", {
    data: [record],
  });

  const result = json.data?.[0];
  if (!result || result.status !== "success" || !result.details?.id) {
    throw new Error(
      `Zoho create prospect failed: [${result?.code ?? "UNKNOWN"}] ${result?.message ?? "No ID returned"}`
    );
  }

  return { id: result.details.id, name: input.name.trim() };
}

// ─── People page: full prospect list (all stages) ────────────────────────────

/**
 * Fetches ALL Prospect records from Zoho for the People page.
 * No stage criteria — returns every prospect including Dead, Funded, Nurture.
 * Loops all pages (max 10 × 200 = 2 000 records) to ensure nothing is missed.
 *
 * Custom query:
 *   GET /Prospect?fields={PROSPECT_FIELDS}&per_page=200&page=N
 *   Repeats while info.more_records === true
 */
export async function getAllProspectsForPeople(
  accessToken: string
): Promise<ZohoProspect[]> {
  const all: ZohoProspect[] = [];
  let page = 1;

  while (page <= 10) {
    const { data: json } = await zohoApi.get<ZohoListApiResponse>(
      accessToken,
      "/Prospect",
      { fields: PROSPECT_FIELDS, per_page: 200, page }
    );

    if (json.status === "error" || json.code) {
      throw new Error(
        `Zoho people list error: [${json.code ?? "UNKNOWN"}] ${json.message ?? ""}`
      );
    }

    const records = json.data ?? [];
    all.push(...records);

    if (!json.info?.more_records || records.length === 0) break;
    page++;
  }

  return all;
}

// ─── Dashboard action-queue query ────────────────────────────────────────────

/**
 * Custom Zoho query purpose-built for the dashboard action queue.
 *
 * Two targeted GET calls (no full list needed):
 *   1. GET /Prospect/search — criteria excludes Dead / Lost + Funded
 *                           — sorted Next_Action_Date ASC so overdue come first
 *                           — loops pages until more_records = false
 *   2. Nothing more needed; overdue / stale / due-today filtering is done
 *      client-side from the full active prospect set.
 *
 * This guarantees ALL overdue prospects appear regardless of total pipeline size.
 */
export async function getDashboardQueueProspects(
  accessToken: string
): Promise<ZohoProspect[]> {
  // Exclude Dead / Lost and Funded so Zoho returns a smaller, relevant set.
  // Sorting by Next_Action_Date ascending puts overdue records at the top of
  // every page — even if there are 500+ active prospects.
  const criteria =
    "((Pipeline_Stage:not_equal:Dead / Lost)and(Pipeline_Stage:not_equal:Funded))";

  // Note: Zoho /Prospect/search does not support sort_by on custom fields like
  // Next_Action_Date. Ordering (overdue → stale → due today) is applied
  // client-side in buildActionQueue after the full active set is fetched.
  const baseParams: Record<string, string | number> = {
    fields: PROSPECT_FIELDS,
    criteria,
    per_page: 200,
  };

  const all: ZohoProspect[] = [];
  let page = 1;

  // Fetch up to 10 pages (2 000 records) to cover any realistic pipeline.
  while (page <= 10) {
    const { data: json } = await zohoApi.get<ZohoListApiResponse>(
      accessToken,
      "/Prospect/search",
      { ...baseParams, page }
    );

    if (json.status === "error" || json.code) {
      throw new Error(
        `Zoho dashboard queue error: [${json.code ?? "UNKNOWN"}] ${json.message ?? ""}`
      );
    }

    const records = json.data ?? [];
    all.push(...records);

    if (!json.info?.more_records || records.length === 0) break;
    page++;
  }

  return all;
}

// ─── Dashboard stats query ────────────────────────────────────────────────────

/**
 * Lightweight Zoho query for dashboard stats only.
 * Requests the absolute minimum fields needed to compute pipeline/committed/funded values.
 * Custom query: GET /Prospect?fields=id,Pipeline_Stage,Initial_Investment_Target,Committed_Amount&per_page=200
 */
const STATS_FIELDS = [
  "id",
  "Pipeline_Stage",
  "Initial_Investment_Target",
  "Committed_Amount",
].join(",");

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

export type ZohoDashboardStats = {
  activePipelineCount: number;
  pipelineValue: number;
  committedValue: number;
  fundedYTD: number;
};

type StatsRecord = {
  id: string;
  Pipeline_Stage: string | null;
  Initial_Investment_Target: number | null;
  Committed_Amount: number | null;
};

export async function getDashboardStatsFromZoho(
  accessToken: string
): Promise<ZohoDashboardStats> {
  // Fetch ALL pages with minimal fields — no record is missed regardless of
  // total pipeline size. Each page costs one Zoho API call; results are cached
  // at the route layer so this only runs once every ~12 minutes.
  const allRecords: StatsRecord[] = [];
  let page = 1;

  while (true) {
    const { data: json } = await zohoApi.get<{ data?: StatsRecord[]; info?: ZohoPaginationInfo }>(
      accessToken,
      "/Prospect",
      { fields: STATS_FIELDS, per_page: 200, page }
    );

    const batch: StatsRecord[] = json.data ?? [];
    allRecords.push(...batch);

    // Stop when Zoho says there are no more pages
    if (!json.info?.more_records || batch.length === 0) break;
    page++;
  }

  const active    = allRecords.filter(r => ACTIVE_ZOHO_STAGES.has(r.Pipeline_Stage ?? ""));
  const committed = allRecords.filter(r => COMMITTED_ZOHO_STAGES.has(r.Pipeline_Stage ?? ""));
  const funded    = allRecords.filter(r => r.Pipeline_Stage === "Funded");

  return {
    activePipelineCount: active.length,
    pipelineValue:   active.reduce((s, r) => s + (r.Initial_Investment_Target ?? 0), 0),
    committedValue:  committed.reduce((s, r) => s + (r.Committed_Amount ?? 0), 0),
    fundedYTD:       funded.reduce((s, r) => s + (r.Committed_Amount ?? 0), 0),
  };
}

// ─── Single prospect detail ───────────────────────────────────────────────────

function wrapZohoError(label: string, err: unknown): never {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    const body = err.response?.data as { message?: string; code?: string } | undefined;
    throw new Error(`${label} (${status ?? "network"}): ${body?.message ?? body?.code ?? err.message}`);
  }
  throw err;
}

/** GET /Prospect/{id} */
export async function getProspectById(
  accessToken: string,
  id: string
): Promise<ZohoProspectDetail> {
  try {
    const { data: json } = await zohoApi.get<{ data?: ZohoProspectDetail[] }>(
      accessToken,
      `/Prospect/${id}`
    );
    const record = json.data?.[0];
    if (!record) throw new Error("Prospect not found.");
    return record;
  } catch (err) {
    wrapZohoError("Zoho Prospect detail error", err);
  }
}

/** GET /Prospect/{id}/Notes */
export async function getProspectNotes(
  accessToken: string,
  id: string
): Promise<ZohoNote[]> {
  try {
    const { data: json } = await zohoApi.get<{ data?: ZohoNote[] }>(
      accessToken,
      `/Prospect/${id}/Notes`,
      {
        fields: "id,Note_Title,Note_Content,Created_Time,Modified_Time,Created_By,Modified_By,Owner",
        per_page: 50,
      }
    );
    return json.data ?? [];
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 204) return [];
    wrapZohoError("Zoho Prospect notes error", err);
  }
}

/**
 * GET /Prospect/{id}/Emails
 * Response key is "Emails" (not the standard "data").
 * Returns up to 10 emails per call.
 */
export async function getProspectEmails(
  accessToken: string,
  id: string
): Promise<ZohoEmail[]> {
  try {
    const { data: json } = await zohoApi.get<{ Emails?: ZohoEmail[] }>(
      accessToken,
      `/Prospect/${id}/Emails`
    );
    return json.Emails ?? [];
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 204) return [];
    wrapZohoError("Zoho Prospect emails error", err);
  }
}

/**
 * GET /Prospect/{id}/Calls
 * Returns calls linked to this prospect.
 */
export async function getProspectCalls(
  accessToken: string,
  id: string
): Promise<ZohoCall[]> {
  try {
    const { data: json } = await zohoApi.get<{ data?: ZohoCall[] }>(
      accessToken,
      `/Prospect/${id}/Calls`,
      {
        fields: "id,Subject,Call_Agenda,Call_Purpose,Call_Status,Call_Start_Time,Call_Duration,Call_Type,Description,Owner,Who_Id,Modified_Time,Created_Time",
        per_page: 50,
      }
    );
    return json.data ?? [];
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 204) return [];
    wrapZohoError("Zoho Prospect calls error", err);
  }
}

/**
 * GET /Prospect/{id}/Events
 * Returns meetings/events linked to this prospect.
 */
export async function getProspectEvents(
  accessToken: string,
  id: string
): Promise<ZohoEvent[]> {
  try {
    const { data: json } = await zohoApi.get<{ data?: ZohoEvent[] }>(
      accessToken,
      `/Prospect/${id}/Events`,
      {
        fields: "id,Event_Title,Start_DateTime,End_DateTime,Description,Owner,Venue,All_Day,Modified_Time,Created_Time",
        per_page: 50,
      }
    );
    return json.data ?? [];
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 204) return [];
    wrapZohoError("Zoho Prospect events error", err);
  }
}

/** GET /Prospect/{id}/Pipeline_Stage_History */
export async function getProspectStageHistory(
  accessToken: string,
  id: string
): Promise<ZohoStageHistory[]> {
  try {
    const { data: json } = await zohoApi.get<{ data?: ZohoStageHistory[] }>(
      accessToken,
      `/Prospect/${id}/Pipeline_Stage_History`,
      {
        fields: "id,Pipeline_Stage,Duration_Days,Modified_Time,Modified_By,Next_Action,Next_Action_Date",
        per_page: 50,
      }
    );
    return json.data ?? [];
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 204) return [];
    wrapZohoError("Zoho Prospect stage history error", err);
  }
}

/** GET /Prospect/{id}/Attachments */
export async function getProspectAttachments(
  accessToken: string,
  id: string
): Promise<ZohoAttachment[]> {
  try {
    const { data: json } = await zohoApi.get<{ data?: ZohoAttachment[] }>(
      accessToken,
      `/Prospect/${id}/Attachments`,
      {
        fields: "id,File_Name,Size,Created_Time,Created_By",
        per_page: 50,
      }
    );
    return json.data ?? [];
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 204) return [];
    wrapZohoError("Zoho Prospect attachments error", err);
  }
}

/** GET /Prospect/{id}/Tasks */
export async function getProspectTasks(
  accessToken: string,
  id: string
): Promise<ZohoTask[]> {
  try {
    const { data: json } = await zohoApi.get<{ data?: ZohoTask[] }>(
      accessToken,
      `/Prospect/${id}/Tasks`,
      {
        fields: "id,Subject,Status,Priority,Due_Date,Closed_Time,Description,Owner",
        per_page: 50,
      }
    );
    return json.data ?? [];
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 204) return [];
    wrapZohoError("Zoho Prospect tasks error", err);
  }
}

/** GET /Prospect/{id}/Funded — linked Funded Investor records */
export async function getProspectFunded(
  accessToken: string,
  id: string
): Promise<ZohoFundedRecord[]> {
  try {
    const { data: json } = await zohoApi.get<{ data?: ZohoFundedRecord[] }>(
      accessToken,
      `/Prospect/${id}/Funded`,
      {
        fields: "id,Name,Email,Owner",
        per_page: 50,
      }
    );
    return json.data ?? [];
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 204) return [];
    wrapZohoError("Zoho Prospect funded records error", err);
  }
}

/** GET /Prospect/{id}/__timeline — response is { __timeline: [...], info: {...} } */
export async function getProspectTimeline(
  accessToken: string,
  id: string
): Promise<ZohoTimelineEvent[]> {
  try {
    const { data: json } = await zohoApi.get<{ __timeline?: ZohoTimelineEvent[]; info?: unknown }>(
      accessToken,
      `/Prospect/${id}/__timeline`,
      {
        include_inner_details: "field_history.data_type,field_history.field_label,done_by.type__s,done_by.profile",
        sort_by: "audited_time",
        per_page: 50,
      }
    );
    return json.__timeline ?? [];
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 204) return [];
    wrapZohoError("Zoho Prospect timeline error", err);
  }
}
