"use client";

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
  const currentIdx = PROGRESSION_STAGES.indexOf(currentStage);

  async function handleStageClick(stage: PipelineStage) {
    if (stage === currentStage) return;
    const label = STAGE_LABELS[stage];
    if (!confirm(`Change stage to ${label}?`)) return;

    await fetch(`/api/persons/${personId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStage: stage }),
    });
    router.refresh();
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-navy">Stage Progression</h3>

      <div className="flex items-center gap-1">
        {PROGRESSION_STAGES.map((stage, idx) => {
          const isActive = stage === currentStage;
          const isPast = idx < currentIdx;
          const config = PIPELINE_STAGES.find((s) => s.key === stage);

          return (
            <button
              key={stage}
              onClick={() => handleStageClick(stage)}
              className={`flex-1 rounded-md py-2 text-[9px] font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-gold text-navy shadow-sm"
                  : isPast
                  ? "bg-navy/10 text-navy/60"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              title={config?.label}
            >
              {config?.label}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex gap-2">
        <button
          onClick={() => handleStageClick("nurture")}
          className={`rounded-md px-3 py-1.5 text-[10px] font-medium transition-colors ${
            currentStage === "nurture"
              ? "bg-gold text-navy"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Nurture
        </button>
        <button
          onClick={() => handleStageClick("dead")}
          className={`rounded-md px-3 py-1.5 text-[10px] font-medium transition-colors ${
            currentStage === "dead"
              ? "bg-alert-red text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Dead
        </button>
      </div>
    </div>
  );
}
