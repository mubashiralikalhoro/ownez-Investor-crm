"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { StatColumn } from "./stat-column";
import { PipelineFunnel } from "./pipeline-funnel";
import { SourceROITable } from "./source-roi-table";
import { RedFlags } from "./red-flags";
import { toPersonWithComputed, todayISO } from "@/lib/zoho-map";
import { PIPELINE_STAGES, ACTIVE_PIPELINE_STAGES, LEAD_SOURCE_LABELS } from "@/lib/constants";
import type { ZohoProspect } from "@/types";
import type {
  PersonWithComputed,
  LeadershipStats,
  FunnelStage,
  SourceROIRow,
} from "@/lib/types";

// ─── Computations from PersonWithComputed[] ───────────────────────────────────

function computeStats(people: PersonWithComputed[]): LeadershipStats {
  const active = people.filter(p => p.pipelineStage && ACTIVE_PIPELINE_STAGES.includes(p.pipelineStage));
  const funded = people.filter(p => p.pipelineStage === "funded");
  return {
    aumRaised:      funded.reduce((s, p) => s + (p.committedAmount ?? 0), 0),
    fundTarget:     0,
    fundedYTDCount: funded.length,
    activeCount:    active.length,
    pipelineValue:  active.reduce((s, p) => s + (p.initialInvestmentTarget ?? 0), 0),
  };
}

function computeFunnel(people: PersonWithComputed[]): FunnelStage[] {
  return PIPELINE_STAGES
    .map(s => ({
      stage:      s.key,
      label:      s.label,
      count:      people.filter(p => p.pipelineStage === s.key).length,
      totalValue: people
        .filter(p => p.pipelineStage === s.key)
        .reduce((sum, p) => sum + (p.initialInvestmentTarget ?? 0), 0),
    }))
    .filter(s => s.count > 0);
}

function computeSourceROI(people: PersonWithComputed[]): SourceROIRow[] {
  const map = new Map<string, PersonWithComputed[]>();

  for (const p of people) {
    if (!p.leadSource) continue;
    if (!map.has(p.leadSource)) map.set(p.leadSource, []);
    map.get(p.leadSource)!.push(p);
  }

  return Array.from(map.entries())
    .map(([source, prospects]) => {
      const funded = prospects.filter(p => p.pipelineStage === "funded");
      return {
        source,
        label:          LEAD_SOURCE_LABELS[source] ?? source,
        prospectCount:  prospects.length,
        fundedCount:    funded.length,
        aum:            funded.reduce((s, p) => s + (p.committedAmount ?? 0), 0),
        conversionPct:  prospects.length > 0
          ? Math.round((funded.length / prospects.length) * 100)
          : 0,
      };
    })
    .sort((a, b) => b.aum - a.aum || b.prospectCount - a.prospectCount);
}

function computeRedFlags(people: PersonWithComputed[]): PersonWithComputed[] {
  return people
    .filter(p =>
      p.pipelineStage &&
      ACTIVE_PIPELINE_STAGES.includes(p.pipelineStage) &&
      (p.isStale || p.isOverdue)
    )
    .sort((a, b) => (b.daysSinceLastTouch ?? 0) - (a.daysSinceLastTouch ?? 0));
}

async function tryRefresh(): Promise<boolean> {
  return (await fetch("/api/auth/zoho/refresh", { method: "POST", credentials: "same-origin" })).ok;
}

// ─── Partial access (marketing role) ─────────────────────────────────────────

function PartialView({ sourceROI }: { sourceROI: SourceROIRow[] }) {
  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-navy">Source Attribution</h1>
        <p className="text-sm text-muted-foreground">Lead source performance</p>
      </div>
      <SourceROITable rows={sourceROI} prospects={[]} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface LeadershipClientProps {
  isPartialAccess: boolean;
}

export function LeadershipClient({ isPartialAccess }: LeadershipClientProps) {
  const router = useRouter();
  const [people, setPeople]   = useState<PersonWithComputed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async (isRetry = false) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/leadership/data", { credentials: "same-origin" });

      if (res.status === 401 && !isRetry) {
        const ok = await tryRefresh();
        if (ok) { fetchData(true); return; }
        router.replace("/login?error=Session+expired.");
        return;
      }

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setError(body.error ?? "Failed to load leadership data.");
        return;
      }

      const json = await res.json() as { prospects: ZohoProspect[] };
      const today = todayISO();
      setPeople((json.prospects ?? []).map(p => toPersonWithComputed(p, today)));
    } catch {
      setError("Network error — could not load leadership data.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="h-5 w-32 bg-muted animate-pulse rounded mb-1" />
        <div className="h-3 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="grid grid-cols-5 gap-3 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-lg font-semibold text-navy mb-4">Leadership</h1>
        <div className="flex items-center gap-2 rounded-lg border border-alert-red/25 bg-alert-red/5 px-4 py-3 text-sm text-alert-red max-w-md">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      </div>
    );
  }

  // ── Compute all derived data from the single prospects array ──────────────
  const stats     = computeStats(people);
  const funnel    = computeFunnel(people);
  const sourceROI = computeSourceROI(people);
  const redFlags  = computeRedFlags(people);

  if (isPartialAccess) {
    return <PartialView sourceROI={sourceROI} />;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-navy">Leadership</h1>
        <p className="text-sm text-muted-foreground">Fund performance &amp; pipeline overview</p>
      </div>

      {/* Zone 1: Stats row at top */}
      <StatColumn stats={stats} prospects={people} />

      {/* Zone 2: Funnel + Source ROI side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Pipeline Funnel
          </h3>
          <PipelineFunnel funnel={funnel} prospects={people} />
        </div>
        <div>
          <SourceROITable rows={sourceROI} prospects={people} />
        </div>
      </div>

      {/* Zone 3: Red flags full width */}
      <RedFlags prospects={redFlags} />
    </div>
  );
}
