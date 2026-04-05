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
import type { PersonWithComputed, DashboardStats } from "@/lib/types";
import { toPersonWithComputed, todayISO } from "@/lib/zoho-map";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function tryRefresh(): Promise<boolean> {
  return (await fetch("/api/auth/zoho/refresh", { method: "POST", credentials: "same-origin" })).ok;
}

function daysBetween(dateStr: string, today: string): number {
  const a = new Date(dateStr + "T00:00:00");
  const b = new Date(today + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
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
      const res = await fetch("/api/dashboard/data", { credentials: "same-origin" });

      if (res.status === 401 && !isRetry) {
        const ok = await tryRefresh();
        if (ok) { fetchAll(true); return; }
        router.replace("/login?error=Session+expired.");
        return;
      }

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setError(body.error ?? "Failed to load dashboard.");
        return;
      }

      const json = await res.json() as { prospects: ZohoProspect[]; stats: DashboardStats };
      const today = todayISO();
      setProspects((json.prospects ?? []).map(p => toPersonWithComputed(p, today)));
      setStats(json.stats);
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
