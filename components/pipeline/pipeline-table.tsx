"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown } from "lucide-react";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { STAGE_LABELS, LEAD_SOURCE_LABELS, NEXT_ACTION_TYPES, PIPELINE_STAGES, LEAD_SOURCES } from "@/lib/constants";
import type { PersonWithComputed, PipelineStage, LeadSource } from "@/lib/types";

type SortKey = "fullName" | "organizationName" | "pipelineStage" | "initialInvestmentTarget" | "growthTarget" | "leadSource" | "activityCount" | "daysSinceLastTouch" | "nextActionDetail" | "nextActionDate";

interface PipelineTableProps {
  people: PersonWithComputed[];
}

export function PipelineTable({ people }: PipelineTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("nextActionDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [stageFilter, setStageFilter] = useState<PipelineStage | "">("");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "">("");
  const [staleOnly, setStaleOnly] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    let result = [...people];
    if (stageFilter) result = result.filter((p) => p.pipelineStage === stageFilter);
    if (sourceFilter) result = result.filter((p) => p.leadSource === sourceFilter);
    if (staleOnly) result = result.filter((p) => p.isStale || p.isOverdue);
    return result;
  }, [people, stageFilter, sourceFilter, staleOnly]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (sortKey) {
        case "fullName": aVal = a.fullName; bVal = b.fullName; break;
        case "organizationName": aVal = a.organizationName ?? ""; bVal = b.organizationName ?? ""; break;
        case "pipelineStage": {
          const stageOrder = PIPELINE_STAGES.findIndex((s) => s.key === a.pipelineStage);
          const stageOrderB = PIPELINE_STAGES.findIndex((s) => s.key === b.pipelineStage);
          aVal = stageOrder; bVal = stageOrderB; break;
        }
        case "initialInvestmentTarget": aVal = a.initialInvestmentTarget ?? 0; bVal = b.initialInvestmentTarget ?? 0; break;
        case "growthTarget": aVal = a.growthTarget ?? 0; bVal = b.growthTarget ?? 0; break;
        case "leadSource": aVal = a.leadSource ?? ""; bVal = b.leadSource ?? ""; break;
        case "activityCount": aVal = a.activityCount; bVal = b.activityCount; break;
        case "daysSinceLastTouch": aVal = a.daysSinceLastTouch ?? 999; bVal = b.daysSinceLastTouch ?? 999; break;
        case "nextActionDetail": aVal = a.nextActionDetail ?? ""; bVal = b.nextActionDetail ?? ""; break;
        case "nextActionDate": aVal = a.nextActionDate ?? "9999"; bVal = b.nextActionDate ?? "9999"; break;
      }

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const hasFilters = stageFilter || sourceFilter || staleOnly;

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return null;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  const TH = ({ column, children, className }: { column: SortKey; children: React.ReactNode; className?: string }) => (
    <th
      className={`px-4 py-2.5 font-medium cursor-pointer select-none hover:text-navy transition-colors ${className ?? ""}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        <SortIcon column={column} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as PipelineStage | "")}
          className="rounded-md border bg-card px-2.5 py-1.5 text-xs"
        >
          <option value="">All Stages</option>
          {PIPELINE_STAGES.filter((s) => !["nurture", "dead", "funded"].includes(s.key)).map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as LeadSource | "")}
          className="rounded-md border bg-card px-2.5 py-1.5 text-xs"
        >
          <option value="">All Sources</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={staleOnly}
            onChange={(e) => setStaleOnly(e.target.checked)}
            className="rounded"
          />
          Stale Only
        </label>

        {hasFilters && (
          <button
            onClick={() => { setStageFilter(""); setSourceFilter(""); setStaleOnly(false); }}
            className="rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted/80"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-card">
        {sorted.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No prospects match your filters
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <TH column="fullName">Name</TH>
                <TH column="organizationName">Company</TH>
                <TH column="pipelineStage">Stage</TH>
                <TH column="initialInvestmentTarget" className="text-right">Initial Inv.</TH>
                <TH column="growthTarget" className="text-right">Growth Target</TH>
                <TH column="leadSource">Source</TH>
                <TH column="activityCount" className="text-right">Touches</TH>
                <TH column="daysSinceLastTouch" className="text-right">Days Idle</TH>
                <TH column="nextActionDetail">Next Action</TH>
                <TH column="nextActionDate">Date</TH>
                <th className="px-4 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((person) => (
                <tr
                  key={person.id}
                  className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <Link href={`/person/${person.id}`} className="font-medium text-navy hover:text-gold transition-colors">
                      {person.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {person.organizationName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-[10px]">
                      {person.pipelineStage ? STAGE_LABELS[person.pipelineStage] : "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(person.initialInvestmentTarget)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(person.growthTarget)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {person.leadSource ? LEAD_SOURCE_LABELS[person.leadSource] ?? person.leadSource : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {person.activityCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={person.isStale ? "text-alert-red font-medium" : ""}>
                      {person.daysSinceLastTouch ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                    {person.nextActionDetail ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={person.isOverdue ? "text-alert-red font-medium" : "text-muted-foreground"}>
                      {formatRelativeDate(person.nextActionDate)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(person.isStale || person.isOverdue) && (
                      <span className="inline-block h-2 w-2 rounded-full bg-alert-red" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
