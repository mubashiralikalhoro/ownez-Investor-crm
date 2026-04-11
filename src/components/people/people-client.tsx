"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";
import { PeopleSearch } from "@/components/people/people-search";
import { PeopleSkeleton } from "@/components/people/people-skeleton";
import type { ZohoProspect } from "@/types";
import type { PersonWithComputed, PipelineStage, LeadSource } from "@/lib/types";

// ─── Stage / source mapping (mirrors dashboard-client) ───────────────────────

const ZOHO_TO_STAGE: Record<string, PipelineStage> = {
  "Prospect": "prospect",
  "Initial Contact": "initial_contact",
  "Discovery": "discovery",
  "Pitch": "pitch",
  "Active Engagement": "active_engagement",
  "Soft Commit": "soft_commit",
  "Commitment Processing": "commitment_processing",
  "KYC / Docs": "kyc_docs",
  "Funded": "funded",
  "Nurture": "nurture",
  "Dead / Lost": "dead",
};

const ZOHO_TO_LEAD_SOURCE: Record<string, LeadSource> = {
  "Velocis Network": "velocis_network",
  "CPA Referral": "cpa_referral",
  "Legacy Event": "legacy_event",
  "LinkedIn": "linkedin",
  "Ken - DBJ List": "ken_dbj_list",
  "Ken - Event Follow-up": "ken_event_followup",
  "Tolleson WM": "tolleson_wm",
  "M&A Attorney": "ma_attorney",
  "Cold Outreach": "cold_outreach",
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Map a ZohoProspect to PersonWithComputed.
 *
 * Role assignment:
 *   "Funded" stage   → ["funded_investor"]   (so "Funded" filter tab works)
 *   All other stages → ["prospect"]           (so "Active" filter tab works)
 */
function toPersonWithComputed(p: ZohoProspect, today: string): PersonWithComputed {
  const stage = ZOHO_TO_STAGE[p.Pipeline_Stage ?? ""] ?? null;
  const isFunded = stage === "funded";
  const isOverdue = !!(p.Next_Action_Date && p.Next_Action_Date < today);

  return {
    id: p.id,
    fullName: p.Name,
    createdDate: "",
    email: p.Email ?? null,
    phone: p.Phone ?? null,
    organizationId: null,
    roles: isFunded ? ["funded_investor"] : ["prospect"],
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

// ─── Component ────────────────────────────────────────────────────────────────

export function PeopleClient() {
  const router = useRouter();
  const [people, setPeople] = useState<PersonWithComputed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPeople = useCallback(async (isRetry = false) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/people", { credentials: "same-origin" });

      if (res.status === 401 && !isRetry) {
        const ok = await (await fetch("/api/auth/zoho/refresh", { method: "POST", credentials: "same-origin" })).ok;
        if (ok) { fetchPeople(true); return; }
        router.replace("/login?next=/people");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const json = await res.json() as { data: ZohoProspect[] };
      const today = todayISO();
      setPeople((json.data ?? []).map((p) => toPersonWithComputed(p, today)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load people.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  if (loading) {
    return <PeopleSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 py-10">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle size={16} />
          {error}
        </div>
        <button
          onClick={() => fetchPeople()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-navy transition-colors"
        >
          <RefreshCw size={12} />
          Retry
        </button>
      </div>
    );
  }

  return <PeopleSearch allPeople={people} />;
}
