import type { ZohoProspect } from "@/types";
import type { PersonWithComputed, PipelineStage, LeadSource } from "@/lib/types";

export const ZOHO_TO_STAGE: Record<string, PipelineStage> = {
  "Prospect":               "prospect",
  "Initial Contact":        "initial_contact",
  "Discovery":              "discovery",
  "Pitch":                  "pitch",
  "Active Engagement":      "active_engagement",
  "Soft Commit":            "soft_commit",
  "Commitment Processing":  "commitment_processing",
  "KYC / Docs":             "kyc_docs",
  "Funded":                 "funded",
  "Nurture":                "nurture",
  "Dead / Lost":            "dead",
};

export const ZOHO_TO_LEAD_SOURCE: Record<string, LeadSource> = {
  "Velocis Network":     "velocis_network",
  "CPA Referral":        "cpa_referral",
  "Legacy Event":        "legacy_event",
  "LinkedIn":            "linkedin",
  "Ken - DBJ List":      "ken_dbj_list",
  "Ken - Event Follow-up": "ken_event_followup",
  "Tolleson WM":         "tolleson_wm",
  "M&A Attorney":        "ma_attorney",
  "Cold Outreach":       "cold_outreach",
};

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toPersonWithComputed(p: ZohoProspect, today: string): PersonWithComputed {
  const stage = ZOHO_TO_STAGE[p.Pipeline_Stage ?? ""] ?? null;
  const isOverdue = !!(p.Next_Action_Date && p.Next_Action_Date < today);

  return {
    id: p.id,
    fullName: p.Name,
    createdDate: "",
    email: p.Email ?? null,
    phone: p.Phone ?? null,
    organizationId: null,
    roles: ["prospect"],
    pipelineStage: stage,
    stageChangedDate: null,
    initialInvestmentTarget: p.Initial_Investment_Target ?? null,
    growthTarget: p.Growth_Target ?? null,
    committedAmount: p.Committed_Amount ?? null,
    commitmentDate: null,
    nextActionType: null,
    nextActionDetail: p.Next_Action ?? null,
    nextActionDate: p.Next_Action_Date ?? null,
    leadSource: ZOHO_TO_LEAD_SOURCE[p.Lead_Source ?? ""] ?? null,
    assignedRepId: p.Owner?.id ?? null,
    collaboratorIds: [],
    notes: null,
    lostReason: null,
    reengageDate: null,
    contactType: null,
    contactCompany: p.Company_Entity ?? null,
    organizationName: p.Company_Entity ?? null,
    assignedRepName: p.Owner?.name ?? null,
    daysSinceLastTouch: p.Days_Since_Last_Touch ?? null,
    isStale: p.Stale_Flag === true,
    isOverdue,
    activityCount: 0,
    referrerName: null,
  };
}
