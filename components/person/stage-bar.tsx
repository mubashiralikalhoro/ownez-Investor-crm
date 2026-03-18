"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/lib/constants";
import type { PipelineStage } from "@/lib/types";

const PROGRESSION_STAGES: PipelineStage[] = [
  "prospect", "initial_contact", "discovery", "pitch",
  "active_engagement", "soft_commit", "commitment_processing",
  "kyc_docs", "funded",
];

interface StageBarProps {
  currentStage: PipelineStage;
  personId: string;
}

export function StageBar({ currentStage, personId }: StageBarProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const currentIdx = PROGRESSION_STAGES.indexOf(currentStage);
  const isSpecial = currentStage === "nurture" || currentStage === "dead";
  const currentLabel = STAGE_LABELS[currentStage] ?? currentStage;

  async function handleStageClick(stage: PipelineStage) {
    if (stage === currentStage) return;
    const label = STAGE_LABELS[stage];
    if (!confirm(`Change stage to ${label}?`)) return;

    await fetch(`/api/persons/${personId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStage: stage }),
    });
    setExpanded(false);
    router.refresh();
  }

  return (
    <div>
      {/* Dot progression */}
      <div
        className="cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-0 px-1">
          {PROGRESSION_STAGES.map((stage, idx) => {
            const isActive = stage === currentStage;
            const isPast = idx < currentIdx && !isSpecial;
            const isFuture = idx > currentIdx || isSpecial;
            const isLast = idx === PROGRESSION_STAGES.length - 1;

            return (
              <div key={stage} className="flex items-center flex-1">
                {/* Dot */}
                <div className="relative flex flex-col items-center">
                  <div
                    className={`rounded-full transition-all ${
                      isActive
                        ? "h-3.5 w-3.5 bg-gold shadow-[0_0_0_3px_rgba(232,186,48,0.15)]"
                        : isPast
                        ? "h-2.5 w-2.5 bg-navy"
                        : "h-2.5 w-2.5 border-2 border-muted-foreground/25 bg-transparent"
                    }`}
                  />
                  {/* Label below active dot */}
                  {isActive && !isSpecial && (
                    <span className="absolute top-5 whitespace-nowrap text-[10px] font-semibold text-navy">
                      {currentLabel}
                    </span>
                  )}
                </div>
                {/* Connector line */}
                {!isLast && (
                  <div
                    className={`flex-1 h-0.5 mx-0.5 ${
                      isPast && !isActive ? "bg-navy/30" : "bg-muted-foreground/15"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Special stage label (nurture/dead) */}
        {isSpecial && (
          <p className={`mt-1.5 text-[10px] font-semibold ${
            currentStage === "dead" ? "text-alert-red" : "text-gold"
          }`}>
            {currentLabel}
          </p>
        )}

        {/* Spacer for the label below the dots */}
        {!isSpecial && <div className="h-5" />}

        {/* Expand hint */}
        <p className="text-[9px] text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors text-center mt-0.5">
          {expanded ? "click to collapse" : "click to change stage"}
        </p>
      </div>

      {/* Expanded stage picker */}
      {expanded && (
        <div className="mt-3 rounded-lg border bg-card p-3 space-y-1.5">
          {PROGRESSION_STAGES.map((stage, idx) => {
            const isActive = stage === currentStage;
            const isPast = idx < currentIdx && !isSpecial;
            const stepNum = idx + 1;

            return (
              <button
                key={stage}
                onClick={() => handleStageClick(stage)}
                className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                  isActive
                    ? "bg-gold text-navy"
                    : isPast
                    ? "bg-navy/5 text-navy hover:bg-navy/10"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className={`text-[10px] tabular-nums w-4 text-center shrink-0 ${
                  isActive ? "font-bold" : "font-medium opacity-50"
                }`}>
                  {stepNum}
                </span>
                <span className="text-xs font-medium">{STAGE_LABELS[stage]}</span>
              </button>
            );
          })}
          <div className="flex gap-1.5 pt-1.5 mt-1.5 border-t">
            <button
              onClick={() => handleStageClick("nurture")}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                currentStage === "nurture"
                  ? "bg-gold text-navy"
                  : "bg-muted text-muted-foreground hover:bg-gold/15 hover:text-gold"
              }`}
            >
              Nurture
            </button>
            <button
              onClick={() => handleStageClick("dead")}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                currentStage === "dead"
                  ? "bg-alert-red text-white"
                  : "bg-muted text-muted-foreground hover:bg-alert-red/10 hover:text-alert-red"
              }`}
            >
              Dead
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
