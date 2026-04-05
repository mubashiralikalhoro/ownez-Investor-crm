"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { HeroCard, HeroCardEmpty } from "@/components/dashboard/hero-card";
import { ActionQueue } from "@/components/dashboard/action-queue";
import { StatsFooter } from "@/components/dashboard/stats-footer";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import type { ZohoProspect } from "@/types";
import type {
  PersonWithComputed,
  PipelineStage,
  DashboardStats,
  LeadSource,
} from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function tryRefresh(): Promise<boolean> {
  return (await fetch("/api/auth/zoho/refresh", { method: "POST", credentials: "same-origin" })).ok;
}

// ─── Stage key mapping ────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(dateStr: string, today: string): number {
  const a = new Date(dateStr + "T00:00:00");
  const b = new Date(today + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/** Map a single ZohoProspect to the PersonWithComputed shape the UI components expect. */
function toPersonWithComputed(p: ZohoProspect, today: string): PersonWithComputed {
  const stage = ZOHO_TO_STAGE[p.Pipeline_Stage ?? ""] ?? null;
  const isOverdue = !!(p.Next_Action_Date && p.Next_Action_Date < today);

  return {
    // ── Person base fields ──
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
    // ── Computed fields ──
    organizationName: p.Company_Entity ?? null,
    assignedRepName: p.Owner?.name ?? null,
    daysSinceLastTouch: p.Days_Since_Last_Touch ?? null,
    isStale: p.Stale_Flag === true,
    isOverdue,
    activityCount: 0,
    referrerName: null,
  };
}

// ─── Action queue sort (mirrors original page.tsx logic) ─────────────────────

interface QueueItem {
  person: PersonWithComputed;
  daysOverdue: number | null;
  isDueToday: boolean;
}

function buildActionQueue(people: PersonWithComputed[], today: string): QueueItem[] {
  const seen = new Set<string>();
  const result: QueueItem[] = [];

  function addUnique(list: QueueItem[]) {
    for (const item of list) {
      if (!seen.has(item.person.id)) {
        seen.add(item.person.id);
        result.push(item);
      }
    }
  }

  function toItem(p: PersonWithComputed): QueueItem {
    const isOverdue = !!(p.nextActionDate && p.nextActionDate < today);
    return {
      person: p,
      daysOverdue: isOverdue ? daysBetween(p.nextActionDate!, today) : null,
      isDueToday: p.nextActionDate === today,
    };
  }

  // 1. Overdue (not dead/funded/nurture) — most overdue first, then by target
  addUnique(
    people
      .filter(p =>
        p.nextActionDate &&
        p.nextActionDate < today &&
        p.pipelineStage !== "dead" &&
        p.pipelineStage !== "funded" &&
        p.pipelineStage !== "nurture"
      )
      .sort((a, b) => {
        const aDays = daysBetween(a.nextActionDate!, today);
        const bDays = daysBetween(b.nextActionDate!, today);
        return bDays !== aDays
          ? bDays - aDays
          : (b.initialInvestmentTarget ?? 0) - (a.initialInvestmentTarget ?? 0);
      })
      .map(toItem)
  );

  // 2. Stale (not dead/funded/nurture)
  addUnique(
    people
      .filter(p =>
        p.isStale &&
        p.pipelineStage !== "dead" &&
        p.pipelineStage !== "funded" &&
        p.pipelineStage !== "nurture"
      )
      .sort((a, b) => (b.daysSinceLastTouch ?? 0) - (a.daysSinceLastTouch ?? 0))
      .map(toItem)
  );

  // 3. Due today
  addUnique(
    people
      .filter(p =>
        p.nextActionDate === today &&
        p.pipelineStage !== "dead" &&
        p.pipelineStage !== "funded"
      )
      .sort((a, b) => (b.initialInvestmentTarget ?? 0) - (a.initialInvestmentTarget ?? 0))
      .map(toItem)
  );

  // 4. Nurture re-engage today
  addUnique(
    people
      .filter(p => p.pipelineStage === "nurture" && p.reengageDate === today)
      .map(toItem)
  );

  return result;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DashboardClient() {
  const router = useRouter();

  const [prospects, setProspects] = useState<PersonWithComputed[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    activePipelineCount: 0,
    pipelineValue: 0,
    committedValue: 0,
    fundedYTD: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchAll = useCallback(async (isRetry = false) => {
    setLoading(true);
    setError(null);

    try {
      const [queueRes, statsRes] = await Promise.all([
        fetch("/api/dashboard/queue", { credentials: "same-origin" }),
        fetch("/api/dashboard/stats", { credentials: "same-origin" }),
      ]);

      if ((queueRes.status === 401 || statsRes.status === 401) && !isRetry) {
        const ok = await tryRefresh();
        if (ok) { fetchAll(true); return; }
        router.replace("/login?error=Session+expired.");
        return;
      }

      if (!queueRes.ok) {
        const body = await queueRes.json() as { error?: string };
        setError(body.error ?? "Failed to load dashboard.");
        return;
      }

      const today    = todayISO();
      const queueJson = await queueRes.json() as { data: ZohoProspect[] };
      setProspects((queueJson.data ?? []).map(p => toPersonWithComputed(p, today)));

      if (statsRes.ok) {
        setStats(await statsRes.json() as DashboardStats);
      }
    } catch {
      setError("Network error — could not load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const today = todayISO();
  const queue = buildActionQueue(prospects, today);

  const nextUpPerson =
    prospects
      .filter(p =>
        p.nextActionDate &&
        p.nextActionDate > today &&
        p.pipelineStage !== "dead"
      )
      .sort((a, b) =>
        (a.nextActionDate ?? "").localeCompare(b.nextActionDate ?? "")
      )[0] ?? null;

  const hero = queue[0] ?? null;
  const rest = queue.slice(1);

  // urgency is pre-computed inside buildActionQueue — just destructure
  const heroPerson = hero?.person ?? null;
  const heroUrgency = hero
    ? { daysOverdue: hero.daysOverdue, isDueToday: hero.isDueToday }
    : null;
  const queueItems = rest.map(item => ({
    person: item.person,
    daysOverdue: item.daysOverdue,
    isDueToday: item.isDueToday,
  }));

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-lg font-semibold text-navy mb-4">Dashboard</h1>
        <div className="flex items-center gap-2 rounded-lg border border-alert-red/25 bg-alert-red/5 px-4 py-3 text-sm text-alert-red max-w-md">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8">
      {/* Zone 1: Header */}
      <DashboardHeader
        prospects={prospects.filter(p => p.roles.includes("prospect"))}
      />

      <div className="space-y-6">
        {/* Zone 2: Hero Card */}
        {heroPerson && heroUrgency ? (
          <HeroCard
            person={heroPerson}
            daysOverdue={heroUrgency.daysOverdue}
            isDueToday={heroUrgency.isDueToday}
          />
        ) : (
          <HeroCardEmpty nextUpPerson={nextUpPerson} />
        )}

        {/* Zone 3: Action Queue */}
        <ActionQueue items={queueItems} />

        {/* Zone 4: Recent Activity — lazy-loaded on first expand */}
        <RecentActivity />

        {/* Zone 5: Stats Footer */}
        <StatsFooter stats={stats} />
      </div>
    </div>
  );
}
