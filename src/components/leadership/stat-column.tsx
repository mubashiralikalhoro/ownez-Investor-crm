"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import { DrilldownSheet } from "./drilldown-sheet";
import { ACTIVE_PIPELINE_STAGES } from "@/lib/constants";
import type { LeadershipStats, PersonWithComputed } from "@/lib/types";

interface StatColumnProps {
  stats: LeadershipStats;
  prospects: PersonWithComputed[];
}

interface DrilldownState {
  open: boolean;
  title: string;
  prospects: PersonWithComputed[];
  groupByStage?: boolean;
}

const CLOSED: DrilldownState = { open: false, title: "", prospects: [] };

export function StatColumn({ stats, prospects }: StatColumnProps) {
  const [drilldown, setDrilldown] = useState<DrilldownState>(CLOSED);

  function openDrilldown(type: "fundedAll" | "fundedYTD" | "active") {
    if (type === "fundedAll" || type === "fundedYTD") {
      const funded = prospects.filter(p => p.pipelineStage === "funded");
      setDrilldown({
        open: true,
        title: type === "fundedYTD" ? "Funded YTD" : "All Funded Investors",
        prospects: funded,
      });
    } else {
      const active = prospects.filter(
        p => p.pipelineStage && ACTIVE_PIPELINE_STAGES.includes(p.pipelineStage)
      );
      setDrilldown({ open: true, title: "Active Pipeline", prospects: active, groupByStage: true });
    }
  }

  const progressPct = stats.fundTarget > 0
    ? Math.min(100, Math.round((stats.aumRaised / stats.fundTarget) * 100))
    : 0;

  const cards: { label: React.ReactNode; value: React.ReactNode; onClick: () => void }[] = [
    {
      label: "AUM Raised",
      value: <span className="text-lg font-bold text-navy">{formatCurrency(stats.aumRaised)}</span>,
      onClick: () => openDrilldown("fundedAll"),
    },
    {
      label: "Fund Target",
      value: (
        <div className="space-y-1">
          <span className="text-lg font-bold text-navy">{progressPct}%</span>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
          {stats.fundTarget > 0 && (
            <div className="text-[10px] text-muted-foreground">
              {formatCurrency(stats.aumRaised)} of {formatCurrency(stats.fundTarget)}
            </div>
          )}
        </div>
      ),
      onClick: () => openDrilldown("fundedAll"),
    },
    {
      label: "Funded YTD",
      value: <span className="text-lg font-bold text-navy">{stats.fundedYTDCount}</span>,
      onClick: () => openDrilldown("fundedYTD"),
    },
    {
      label: "Active",
      value: <span className="text-lg font-bold text-navy">{stats.activeCount}</span>,
      onClick: () => openDrilldown("active"),
    },
    {
      label: "Pipeline Value",
      value: <span className="text-lg font-bold text-navy">{formatCurrency(stats.pipelineValue)}</span>,
      onClick: () => openDrilldown("active"),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {cards.map((card, i) => (
          <button
            key={i}
            onClick={card.onClick}
            className="text-left rounded-lg border bg-card px-3 py-3 hover:border-gold/60 transition-colors cursor-pointer"
          >
            <div className="text-[10px] text-muted-foreground mb-1 leading-tight">{card.label}</div>
            {card.value}
          </button>
        ))}
      </div>

      <DrilldownSheet
        open={drilldown.open}
        onClose={() => setDrilldown(CLOSED)}
        title={drilldown.title}
        prospects={drilldown.prospects}
        groupByStage={drilldown.groupByStage}
      />
    </>
  );
}
