"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  PROSPECT_PROGRESSION_STAGES,
  PROSPECT_SPECIAL_STAGES,
  getProspectStageIndex,
  isSpecialProspectStage,
} from "@/lib/prospect-config";
import { useLostReasons } from "./use-lost-reasons";

// ─── 1. Stage Bar (interactive — click to change stage) ──────────────────────

export interface StageChangePayload {
  newStage: string;
  nextAction?: string;
  nextActionDate?: string;
  reason?: string;
}

export function ProspectStageBar({
  stage,
  onStageChange,
}: {
  stage: string | null;
  onStageChange?: (payload: StageChangePayload) => Promise<void>;
}) {
  const [expanded,       setExpanded]       = useState(false);
  const [pending,        setPending]        = useState<string | null>(null);
  const [nextAction,     setNextAction]     = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [reason,         setReason]         = useState("");
  const [changing,       setChanging]       = useState(false);
  const [changeErr,      setChangeErr]      = useState<string | null>(null);

  const isSpecial = isSpecialProspectStage(stage);
  const currentIdx = getProspectStageIndex(stage);
  const specialMeta = isSpecial
    ? stage === "Dead / Lost" ? { label: "Dead / Lost", color: "text-alert-red" }
    : { label: "Nurture", color: "text-gold" }
    : null;

  const pendingIsSpecial = pending && PROSPECT_SPECIAL_STAGES.some(s => s.value === pending);
  const pendingIsDead = pending === "Dead / Lost";
  const lostReasons = useLostReasons(pendingIsDead);

  const resetForm = () => {
    setPending(null); setNextAction(""); setNextActionDate(""); setReason(""); setChangeErr(null);
  };

  const confirm = async () => {
    if (!pending || !onStageChange || changing) return;
    setChanging(true); setChangeErr(null);
    try {
      await onStageChange({
        newStage: pending,
        nextAction:     nextAction.trim()     || undefined,
        nextActionDate: nextActionDate.trim() || undefined,
        reason:         reason.trim()         || undefined,
      });
      resetForm(); setExpanded(false);
    } catch (e) {
      setChangeErr(e instanceof Error ? e.message : "Stage change failed");
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="cursor-pointer group" onClick={() => !pending && setExpanded(!expanded)}>
        <div className="flex items-center gap-0 px-1">
          {PROSPECT_PROGRESSION_STAGES.map((s, idx) => {
            const isActive = s.value === stage;
            const isPast = !isSpecial && idx < currentIdx;
            const isLast = idx === PROSPECT_PROGRESSION_STAGES.length - 1;
            return (
              <div key={s.value} className="flex items-center flex-1">
                <div className="relative flex flex-col items-center">
                  <div className={`rounded-full transition-all ${
                    isActive
                      ? "h-3.5 w-3.5 bg-gold shadow-[0_0_0_3px_rgba(232,186,48,0.15)]"
                      : isPast ? "h-2.5 w-2.5 bg-navy"
                      : "h-2.5 w-2.5 border-2 border-muted-foreground/25 bg-transparent"
                  }`} />
                  {isActive && !isSpecial && (
                    <span className="absolute top-5 whitespace-nowrap text-[10px] font-semibold text-navy">{s.label}</span>
                  )}
                </div>
                {!isLast && (
                  <div className={`flex-1 h-0.5 mx-0.5 ${isPast ? "bg-navy/30" : "bg-muted-foreground/15"}`} />
                )}
              </div>
            );
          })}
        </div>

        {specialMeta && <p className={`mt-1.5 text-[10px] font-semibold ${specialMeta.color}`}>{specialMeta.label}</p>}
        {!isSpecial && <div className="h-5" />}

        <p className="text-[9px] text-transparent group-hover:text-muted-foreground/40 transition-colors text-center mt-0.5 select-none">
          {expanded ? "collapse" : onStageChange ? "click stage to change" : "view stages"}
        </p>
      </div>

      {expanded && (
        <div className="mt-3 rounded-lg border bg-card p-3 space-y-1.5">
          {PROSPECT_PROGRESSION_STAGES.map((s, idx) => {
            const isActive = s.value === stage;
            const isPast = !isSpecial && idx < currentIdx;
            const isPending = pending === s.value;
            const canClick = !!onStageChange && s.value !== stage;

            return (
              <button
                key={s.value}
                disabled={!canClick || changing}
                onClick={() => canClick && setPending(isPending ? null : s.value)}
                className={`w-full flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                  isPending ? "bg-gold/20 border border-gold/40"
                  : isActive ? "bg-gold text-navy"
                  : isPast ? "bg-navy/5 text-navy hover:bg-navy/10"
                  : canClick ? "text-muted-foreground hover:bg-muted/50"
                  : "text-muted-foreground opacity-60 cursor-default"
                }`}
              >
                <span className={`text-[10px] tabular-nums w-4 text-center shrink-0 ${isActive ? "font-bold" : "font-medium opacity-50"}`}>
                  {idx + 1}
                </span>
                <span className="text-xs font-medium">{s.label}</span>
                {isPast && !isPending && <span className="ml-auto text-[10px] text-navy/40">✓</span>}
                {isPending && <span className="ml-auto text-[10px] text-gold font-semibold">selected →</span>}
              </button>
            );
          })}

          {/* Special stages */}
          <div className="flex gap-1.5 pt-1.5 mt-1.5 border-t">
            {PROSPECT_SPECIAL_STAGES.map(s => {
              const isActive = s.value === stage;
              const isPending = pending === s.value;
              const canClick = !!onStageChange && s.value !== stage;
              return (
                <button
                  key={s.value}
                  disabled={!canClick || changing}
                  onClick={() => canClick && setPending(isPending ? null : s.value)}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    isPending ? "bg-gold/20 border border-gold/40 text-navy"
                    : isActive && s.value === "Dead / Lost" ? "bg-alert-red text-white"
                    : isActive ? "bg-gold text-navy"
                    : canClick ? "bg-muted text-muted-foreground hover:bg-muted/80"
                    : "bg-muted text-muted-foreground opacity-60 cursor-default"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Pending confirmation */}
          {pending && (
            <div className="mt-2 rounded-lg border border-gold/30 bg-gold/5 p-3 space-y-2.5">
              <p className="text-xs font-semibold text-navy">
                Move to <span className="text-gold">{pending}</span>
              </p>

              {/* Next Action — hidden when moving to Funded or Dead / Lost */}
              {pending !== "Funded" && !pendingIsDead && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Next Action
                    </label>
                    <input
                      value={nextAction}
                      onChange={e => setNextAction(e.target.value)}
                      placeholder="What's the next step? (optional)"
                      className="w-full border border-border rounded px-2 py-1.5 text-xs text-navy bg-white focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Next Action Date
                    </label>
                    <input
                      type="date"
                      value={nextActionDate}
                      onChange={e => setNextActionDate(e.target.value)}
                      className="w-full border border-border rounded px-2 py-1.5 text-xs text-navy bg-white focus:outline-none focus:border-gold"
                    />
                  </div>
                </>
              )}

              {/* Reason — only for special stages */}
              {pendingIsSpecial && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    Reason
                  </label>
                  {pendingIsDead ? (
                    <select
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      className="w-full border border-border rounded px-2 py-1.5 text-xs text-navy bg-white focus:outline-none focus:border-gold"
                    >
                      <option value="">— Select reason —</option>
                      {lostReasons.options.map(o => (
                        <option key={o.actual_value} value={o.actual_value}>{o.display_value}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Why this stage? (optional)"
                      className="w-full border border-border rounded px-2 py-1.5 text-xs text-navy bg-white focus:outline-none focus:border-gold"
                    />
                  )}
                </div>
              )}

              {changeErr && <p className="text-[10px] text-alert-red">{changeErr}</p>}

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={confirm}
                  disabled={changing}
                  className="rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-navy hover:bg-gold-hover disabled:opacity-50 transition-colors"
                >
                  {changing ? <Loader2 size={11} className="animate-spin inline" /> : "Confirm"}
                </button>
                <button
                  onClick={resetForm}
                  className="text-xs text-muted-foreground hover:text-navy transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
