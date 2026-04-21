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
  // Prefer the Activity_Log-derived flag when available; fall back to Next_Action_Date for
  // prospects that predate the commitment lifecycle cutover.
  const isOverdue =
    p.hasOverdueOpenCommitment !== undefined
      ? p.hasOverdueOpenCommitment
      : !!(p.Next_Action_Date && p.Next_Action_Date < today);

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
    referrerName: p.Referrer1?.name ?? null,
  };
}

/**
 * Walk the full prospect list once to find everyone who appears as a
 * Referrer1 or Related_Contact target, then stack those roles onto the
 * matching PersonWithComputed rows. Roles are additive.
 */
export function enrichRolesFromReverseIndex(
  raw: ZohoProspect[],
  people: PersonWithComputed[],
): PersonWithComputed[] {
  const referrerIds = new Set<string>();
  const relatedContactIds = new Set<string>();

  for (const r of raw) {
    if (r.Referrer1?.id)       referrerIds.add(r.Referrer1.id);
    if (r.Related_Contact?.id) relatedContactIds.add(r.Related_Contact.id);
  }

  if (referrerIds.size === 0 && relatedContactIds.size === 0) return people;

  return people.map((p) => {
    const extra: PersonWithComputed["roles"] = [];
    if (referrerIds.has(p.id) && !p.roles.includes("referrer")) {
      extra.push("referrer");
    }
    if (relatedContactIds.has(p.id) && !p.roles.includes("related_contact")) {
      extra.push("related_contact");
    }
    return extra.length === 0 ? p : { ...p, roles: [...p.roles, ...extra] };
  });
}
