"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/format";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/lib/constants";
import type { PersonWithComputed, RecentActivityEntry, PipelineStage } from "@/lib/types";

type ProspectWithFunded = PersonWithComputed & { fundedAmount?: number };

interface DrilldownSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  prospects?: ProspectWithFunded[];
  activities?: RecentActivityEntry[];
  groupByStage?: boolean;
}

function ProspectRow({ p, onClose }: { p: ProspectWithFunded; onClose: () => void }) {
  const displayAmount = p.fundedAmount ?? p.initialInvestmentTarget;
  const amountLabel = p.fundedAmount ? "funded" : "target";
  return (
    <Link
      key={p.id}
      href={`/prospect/${p.id}?from=leadership`}
      onClick={onClose}
      className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-muted transition-colors"
    >
      <div>
        <div className="text-sm font-medium text-navy">{p.fullName}</div>
        {p.pipelineStage && (
          <div className="text-xs text-muted-foreground capitalize">
            {p.pipelineStage.replace(/_/g, " ")}
            {p.daysSinceLastTouch !== null && ` · ${p.daysSinceLastTouch}d idle`}
          </div>
        )}
      </div>
      {displayAmount != null && displayAmount > 0 && (
        <div className="text-right">
          <div className="text-sm font-medium text-navy">{formatCurrency(displayAmount)}</div>
          <div className="text-[10px] text-muted-foreground">{amountLabel}</div>
        </div>
      )}
    </Link>
  );
}

export function DrilldownSheet({ open, onClose, title, prospects, activities, groupByStage }: DrilldownSheetProps) {
  // Group prospects by stage in reverse funnel order (bottom of funnel first)
  const stageGroups = useMemo(() => {
    if (!groupByStage || !prospects?.length) return null;
    // Reverse the active stages so bottom-of-funnel comes first
    const reverseStages = [...PIPELINE_STAGES].reverse();
    const groups: { stage: PipelineStage; label: string; items: ProspectWithFunded[] }[] = [];
    for (const s of reverseStages) {
      const items = prospects.filter((p) => p.pipelineStage === s.key);
      if (items.length > 0) {
        groups.push({ stage: s.key, label: STAGE_LABELS[s.key], items });
      }
    }
    return groups;
  }, [groupByStage, prospects]);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-[400px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-navy text-base">{title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-1">
          {stageGroups && stageGroups.map((group) => (
            <div key={group.stage} className="mb-3">
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</span>
                <span className="text-xs text-muted-foreground">{group.items.length}</span>
              </div>
              {group.items.map((p) => (
                <ProspectRow key={p.id} p={p} onClose={onClose} />
              ))}
            </div>
          ))}

          {prospects && !stageGroups && prospects.map((p) => (
            <ProspectRow key={p.id} p={p} onClose={onClose} />
          ))}

          {activities && activities.map((a) => (
            <div key={a.id} className="px-3 py-2.5 border-b last:border-0">
              <div className="flex items-center justify-between">
                <Link
                  href={`/prospect/${a.personId}?from=leadership`}
                  onClick={onClose}
                  className="text-sm font-medium text-navy hover:text-gold transition-colors"
                >
                  {a.personName}
                </Link>
                <span className="text-xs text-muted-foreground">{a.date}</span>
              </div>
              {a.detail && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.detail}</p>
              )}
            </div>
          ))}

          {!prospects?.length && !activities?.length && (
            <p className="text-sm text-muted-foreground px-3 py-4">No data available.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
