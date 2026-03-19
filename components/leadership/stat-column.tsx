"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/format";
import { DrilldownSheet } from "./drilldown-sheet";
import type { LeadershipStats, PersonWithComputed, RecentActivityEntry } from "@/lib/types";

interface StatColumnProps {
  stats: LeadershipStats;
  meetingsCount: number; // initial count for 30d (server-rendered)
}

interface DrilldownState {
  open: boolean;
  title: string;
  prospects?: PersonWithComputed[];
  activities?: RecentActivityEntry[];
  groupByStage?: boolean;
}

const CLOSED: DrilldownState = { open: false, title: "" };

export function StatColumn({ stats, meetingsCount: initialMeetingsCount }: StatColumnProps) {
  const [meetingDays, setMeetingDays] = useState<7 | 14 | 30>(30);
  const [liveMeetingsCount, setLiveMeetingsCount] = useState(initialMeetingsCount);
  const [drilldown, setDrilldown] = useState<DrilldownState>(CLOSED);

  const fetchMeetingsCount = useCallback(async (days: number) => {
    const res = await fetch(`/api/leadership/meetings?days=${days}`);
    const data = await res.json();
    if (data.count !== undefined) setLiveMeetingsCount(data.count);
  }, []);

  useEffect(() => {
    fetchMeetingsCount(meetingDays);
  }, [meetingDays, fetchMeetingsCount]);

  const progressPct = Math.min(100, Math.round((stats.aumRaised / stats.fundTarget) * 100));

  async function openDrilldown(type: string, value: string, days?: number) {
    const params = new URLSearchParams({ type, value });
    if (days) params.set("days", String(days));
    const res = await fetch(`/api/leadership/drilldown?${params}`);
    const data = await res.json();

    if (type === "kpi" && value === "meetings") {
      setDrilldown({ open: true, title: `Meetings · last ${days}d`, activities: data });
    } else {
      const groupByStage = type === "kpi" && value === "active";
      setDrilldown({ open: true, title: getLabelForDrilldown(type, value, days), prospects: data, groupByStage });
    }
  }

  function getLabelForDrilldown(type: string, value: string, days?: number): string {
    if (type === "kpi" && value === "fundedAll") return "All Funded Investors";
    if (type === "kpi" && value === "fundedYTD") return "Funded YTD";
    if (type === "kpi" && value === "active") return "Active Pipeline";
    return value;
  }

  const cards: { label: string; value: React.ReactNode; onClick: () => void }[] = [
    {
      label: "AUM Raised",
      value: <span className="text-lg font-bold text-navy">{formatCurrency(stats.aumRaised)}</span>,
      onClick: () => openDrilldown("kpi", "fundedAll"),
    },
    {
      label: "Fund Target",
      value: (
        <div className="space-y-1">
          <span className="text-lg font-bold text-navy">{progressPct}%</span>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="text-[10px] text-muted-foreground">{formatCurrency(stats.aumRaised)} of {formatCurrency(stats.fundTarget)}</div>
        </div>
      ),
      onClick: () => openDrilldown("kpi", "fundedAll"),
    },
    {
      label: "Funded YTD",
      value: <span className="text-lg font-bold text-navy">{stats.fundedYTDCount}</span>,
      onClick: () => openDrilldown("kpi", "fundedYTD"),
    },
    {
      label: "Active",
      value: <span className="text-lg font-bold text-navy">{stats.activeCount}</span>,
      onClick: () => openDrilldown("kpi", "active"),
    },
    {
      label: "Pipeline Value",
      value: <span className="text-lg font-bold text-navy">{formatCurrency(stats.pipelineValue)}</span>,
      onClick: () => openDrilldown("kpi", "active"),
    },
    {
      label: (
        <div className="flex flex-col gap-1">
          <span>Meetings</span>
          <div className="flex gap-1">
            {([7, 14, 30] as const).map((d) => (
              <span
                key={d}
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); setMeetingDays(d); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setMeetingDays(d); } }}
                className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-colors cursor-pointer ${
                  meetingDays === d
                    ? "bg-gold text-white border-gold"
                    : "border-gray-200 text-muted-foreground hover:border-gold"
                }`}
              >
                {d}d
              </span>
            ))}
          </div>
        </div>
      ) as unknown as string,
      value: <span className="text-lg font-bold text-navy">{liveMeetingsCount}</span>,
      onClick: () => openDrilldown("kpi", "meetings", meetingDays),
    },
  ];

  return (
    <>
      <div className="w-[115px] shrink-0 flex flex-col gap-2">
        {cards.map((card, i) => (
          <button
            key={i}
            onClick={card.onClick}
            className="w-full text-left rounded-lg border bg-card px-3 py-3 hover:border-gold/60 transition-colors cursor-pointer"
          >
            <div className="text-[10px] text-muted-foreground mb-1 leading-tight">{card.label as React.ReactNode}</div>
            {card.value}
          </button>
        ))}
      </div>

      <DrilldownSheet
        open={drilldown.open}
        onClose={() => setDrilldown(CLOSED)}
        title={drilldown.title}
        prospects={drilldown.prospects}
        activities={drilldown.activities}
        groupByStage={drilldown.groupByStage}
      />
    </>
  );
}
