"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";
import { StatColumn } from "./stat-column";
import { PipelineFunnel } from "./pipeline-funnel";
import { SourceROITable } from "./source-roi-table";
import { RedFlags } from "./red-flags";
import { toPersonWithComputed, todayISO, enrichRolesFromReverseIndex } from "@/lib/zoho-map";
import { PIPELINE_STAGES, ACTIVE_PIPELINE_STAGES, LEAD_SOURCE_LABELS } from "@/lib/constants";
import type { ZohoProspect } from "@/types";
import type {
  PersonWithComputed,
  LeadershipStats,
  FunnelStage,
  SourceROIRow,
} from "@/lib/types";

/** Human-friendly age from an epoch-ms timestamp. Ticks by the second. */
function formatAge(cachedAt: number | null, nowMs: number): string {
  if (!cachedAt) return "—";
  const secs = Math.max(0, Math.floor((nowMs - cachedAt) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  const remSec = secs % 60;
  if (mins < 60) {
    return remSec > 0 ? `${mins}m ${remSec}s ago` : `${mins}m ago`;
  }
  const hrs = Math.floor(mins / 60);
  const remMin = mins % 60;
  return remMin > 0 ? `${hrs}h ${remMin}m ago` : `${hrs}h ago`;
}

// ─── Computations from PersonWithComputed[] ───────────────────────────────────

function computeStats(people: PersonWithComputed[], fundTarget: number): LeadershipStats {
  const active = people.filter(p => p.pipelineStage && ACTIVE_PIPELINE_STAGES.includes(p.pipelineStage));
  const funded = people.filter(p => p.pipelineStage === "funded");
  return {
    aumRaised:      funded.reduce((s, p) => s + (p.committedAmount ?? 0), 0),
    fundTarget,
    fundedYTDCount: funded.length,
    activeCount:    active.length,
    pipelineValue:  active.reduce((s, p) => s + (p.initialInvestmentTarget ?? 0), 0),
  };
}

function computeFunnel(people: PersonWithComputed[]): FunnelStage[] {
  return PIPELINE_STAGES
    .map(s => {
      const inStage = people.filter(p => p.pipelineStage === s.key);
      // Before funding: sum Initial Investment Target (what they plan to invest).
      // After funding:  sum Committed Amount (what actually came through).
      const totalValue = s.key === "funded"
        ? inStage.reduce((sum, p) => sum + (p.committedAmount ?? 0), 0)
        : inStage.reduce((sum, p) => sum + (p.initialInvestmentTarget ?? 0), 0);
      return {
        stage: s.key,
        label: s.label,
        count: inStage.length,
        totalValue,
      };
    })
    .filter(s => s.count > 0);
}

function computeSourceROI(
  people: PersonWithComputed[],
  labelMap: Record<string, string>,
): SourceROIRow[] {
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
        label:          labelMap[source] ?? source,
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
  const [people, setPeople]       = useState<PersonWithComputed[]>([]);
  const [fundTarget, setFundTarget] = useState<number>(0);
  const [sourceLabelMap, setSourceLabelMap] = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [cachedAt, setCachedAt]   = useState<number | null>(null);
  const [nowMs, setNowMs]         = useState<number>(() => Date.now());

  const fetchData = useCallback(async (isRetry = false, force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const url = force ? "/api/leadership/data?refresh=1" : "/api/leadership/data";
      const res = await fetch(url, { credentials: "same-origin" });

      if (res.status === 401 && !isRetry) {
        const ok = await tryRefresh();
        if (ok) { fetchData(true, force); return; }
        router.replace("/login?next=/leadership");
        return;
      }

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setError(body.error ?? "Failed to load leadership data.");
        return;
      }

      const json = await res.json() as {
        prospects:  ZohoProspect[];
        cachedAt?:  number;
        fundTarget?: number;
      };
      const today = todayISO();
      const raw = json.prospects ?? [];
      const mapped = raw.map(p => toPersonWithComputed(p, today));
      setPeople(enrichRolesFromReverseIndex(raw, mapped));
      setCachedAt(json.cachedAt ?? Date.now());
      setFundTarget(json.fundTarget ?? 0);
    } catch {
      setError("Network error — could not load leadership data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Build a label map that covers both internal slugs (from LEAD_SOURCE_LABELS)
  // and Zoho picklist values (from the DB). This way computeSourceROI resolves
  // any key format to a human-readable display name.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/lead-sources", { credentials: "same-origin" });
        if (!res.ok) return;
        const json = (await res.json()) as { data?: { key: string; label: string }[] };
        const map: Record<string, string> = { ...LEAD_SOURCE_LABELS };
        for (const s of json.data ?? []) {
          map[s.key] = s.label;
        }
        setSourceLabelMap(map);
      } catch {
        setSourceLabelMap({ ...LEAD_SOURCE_LABELS });
      }
    })();
  }, []);

  // Tick the "cache age" indicator once per second.
  useEffect(() => {
    if (!cachedAt) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cachedAt]);

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
  const stats     = computeStats(people, fundTarget);
  const funnel    = computeFunnel(people);
  const sourceROI = computeSourceROI(people, sourceLabelMap);
  const redFlags  = computeRedFlags(people);

  if (isPartialAccess) {
    return <PartialView sourceROI={sourceROI} />;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-navy">Leadership</h1>
          <p className="text-sm text-muted-foreground">Fund performance &amp; pipeline overview</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums">
            Last cache: <span className="font-medium text-navy">{formatAge(cachedAt, nowMs)}</span>
          </span>
          <button
            type="button"
            onClick={() => fetchData(false, true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Force-refresh from Zoho and update Redis"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
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
