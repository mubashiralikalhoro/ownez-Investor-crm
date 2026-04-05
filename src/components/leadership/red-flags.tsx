"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import type { PersonWithComputed } from "@/lib/types";

interface RedFlagsProps {
  prospects: PersonWithComputed[];
}

export function RedFlags({ prospects }: RedFlagsProps) {
  if (prospects.length === 0) {
    return (
      <div className="mt-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Red Flags</h3>
        <div className="rounded-lg border border-healthy-green/30 bg-healthy-green-light px-3 py-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-healthy-green shrink-0" />
          <p className="text-xs font-medium text-healthy-green">Pipeline healthy — no stale or overdue prospects</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Red Flags <span className="text-alert-red ml-1">({prospects.length})</span>
      </h3>
      <div className="rounded-lg border border-alert-red/20 bg-red-50 overflow-hidden">
        <div className="divide-y divide-alert-red/10">
          {prospects.slice(0, 8).map((p) => (
            <Link
              key={p.id}
              href={`/person/${p.id}?from=leadership`}
              className="flex items-center gap-2 px-3 py-2 hover:bg-red-100/50 transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-alert-red shrink-0" />
              <span className="text-xs font-medium text-navy truncate flex-1">{p.fullName}</span>
              <Badge variant="secondary" className="text-[9px] shrink-0">
                {p.pipelineStage ? STAGE_LABELS[p.pipelineStage] : "—"}
              </Badge>
              <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
                {formatCurrency(p.initialInvestmentTarget)}
              </span>
              <span className="text-[10px] text-alert-red font-medium shrink-0">
                {p.isOverdue ? `Overdue` : `${p.daysSinceLastTouch}d idle`}
              </span>
            </Link>
          ))}
        </div>
        {prospects.length > 8 && (
          <p className="text-[10px] text-muted-foreground px-3 py-1.5 border-t border-alert-red/10">
            +{prospects.length - 8} more
          </p>
        )}
      </div>
    </div>
  );
}
