"use client";

import { useState } from "react";
import { DrilldownSheet } from "./drilldown-sheet";
import { formatCurrency } from "@/lib/format";
import type { FunnelStage, PersonWithComputed } from "@/lib/types";

interface PipelineFunnelProps {
  funnel: FunnelStage[];
}

// Width percentages: 100% → 90% → 78% → 66% → 54% → 42% → 30%
const WIDTHS = [100, 90, 78, 66, 54, 42, 30];
// Gold shades: darkest at top, lightest before funded
const GOLD_SHADES = ["#e8ba30", "#ecbf44", "#f0c558", "#f2cb6e", "#f4d182", "#f6d896", "#f7ecc8"];

interface DrilldownState {
  open: boolean;
  title: string;
  prospects: PersonWithComputed[];
}

export function PipelineFunnel({ funnel }: PipelineFunnelProps) {
  const [drilldown, setDrilldown] = useState<DrilldownState>({ open: false, title: "", prospects: [] });

  async function openDrilldown(stage: string, label: string) {
    const res = await fetch(`/api/leadership/drilldown?type=stage&value=${stage}`);
    const data: PersonWithComputed[] = await res.json();
    setDrilldown({ open: true, title: `${label} · ${data.length} prospect${data.length !== 1 ? "s" : ""}`, prospects: data });
  }

  const activeFunnel = funnel.filter((f) => f.stage !== "funded" && f.stage !== "nurture" && f.stage !== "dead");
  const fundedStage = funnel.find((f) => f.stage === "funded");

  return (
    <>
      <div className="space-y-0.5">
        {activeFunnel.map((stage, i) => (
          <div key={stage.stage} className="flex flex-col items-center gap-0">
            <button
              onClick={() => openDrilldown(stage.stage, stage.label)}
              className="transition-opacity hover:opacity-80 cursor-pointer rounded-sm"
              style={{ width: `${WIDTHS[Math.min(i, WIDTHS.length - 1)]}%` }}
            >
              <div
                className="flex items-center justify-between px-3 py-2 rounded-sm"
                style={{ backgroundColor: GOLD_SHADES[Math.min(i, GOLD_SHADES.length - 1)] }}
              >
                <span className="text-xs font-medium text-navy">{stage.label}</span>
                <span className="text-xs text-navy/70">
                  {stage.count} · {formatCurrency(stage.totalValue)}
                </span>
              </div>
            </button>
            {i < activeFunnel.length - 1 && (
              <div className="w-3 h-1.5 flex items-center justify-center text-gold/50">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M0 0L5 6L10 0" fill="currentColor" />
                </svg>
              </div>
            )}
          </div>
        ))}

        {/* Chevron before funded */}
        {fundedStage && (
          <div className="flex flex-col items-center gap-0.5 mt-0.5">
            <div className="w-3 h-1.5 flex items-center justify-center text-green-400">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                <path d="M0 0L5 6L10 0" fill="currentColor" />
              </svg>
            </div>
            <button
              onClick={() => openDrilldown("funded", "Funded")}
              className="w-full transition-opacity hover:opacity-80 cursor-pointer"
            >
              <div className="flex items-center justify-between px-3 py-2 rounded-sm bg-green-50 border border-green-300">
                <span className="text-xs font-medium text-green-700">Funded</span>
                <span className="text-xs text-green-600">
                  {fundedStage.count} · {formatCurrency(fundedStage.totalValue)}
                </span>
              </div>
            </button>
          </div>
        )}
      </div>

      <DrilldownSheet
        open={drilldown.open}
        onClose={() => setDrilldown({ open: false, title: "", prospects: [] })}
        title={drilldown.title}
        prospects={drilldown.prospects}
      />
    </>
  );
}
