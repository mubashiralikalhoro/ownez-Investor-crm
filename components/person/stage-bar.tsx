"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PIPELINE_STAGES, STAGE_LABELS, LOST_REASONS } from "@/lib/constants";
import { getTodayCT } from "@/lib/format";
import type { PipelineStage, PersonWithComputed } from "@/lib/types";

const PROGRESSION_STAGES: PipelineStage[] = [
  "prospect", "initial_contact", "discovery", "pitch",
  "active_engagement", "soft_commit", "commitment_processing",
  "kyc_docs", "funded",
];

type InlineMode =
  | { type: "nurture" }
  | { type: "dead" }
  | { type: "funded" }
  | { type: "post_change"; newStage: PipelineStage }
  | null;

interface StageBarProps {
  currentStage: PipelineStage;
  personId: string;
  person: PersonWithComputed;
  onInlineModeChange?: (active: boolean) => void;
}

export function StageBar({ currentStage, personId, person, onInlineModeChange }: StageBarProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [inlineMode, setInlineMode] = useState<InlineMode>(null);

  function setInlineModeWithCallback(mode: InlineMode) {
    setInlineMode(mode);
    onInlineModeChange?.(mode !== null);
  }
  const [saving, setSaving] = useState(false);

  // Nurture form state
  const [reengageDate, setReengageDate] = useState(person.reengageDate ?? "");

  // Dead form state
  const [lostReason, setLostReason] = useState<string>("");

  // Funded form state
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState("llc");
  const [amountInvested, setAmountInvested] = useState("");
  const [investmentDate, setInvestmentDate] = useState(getTodayCT());
  const [track, setTrack] = useState<"maintain" | "grow">("maintain");
  const [growthTarget, setGrowthTarget] = useState("");

  // Post-change form state
  const [nextActionDetail, setNextActionDetail] = useState(person.nextActionDetail ?? "");
  const [nextActionDate, setNextActionDate] = useState(person.nextActionDate ?? "");

  const currentIdx = PROGRESSION_STAGES.indexOf(currentStage);
  const isSpecial = currentStage === "nurture" || currentStage === "dead";
  const currentLabel = STAGE_LABELS[currentStage] ?? currentStage;

  async function applyStageChange(stage: PipelineStage, extra?: Record<string, unknown>) {
    setSaving(true);
    await fetch(`/api/persons/${personId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStage: stage, ...extra }),
    });
    setSaving(false);
  }

  function handleStageClick(stage: PipelineStage) {
    if (stage === currentStage) return;

    if (stage === "nurture") {
      setExpanded(false);
      setInlineModeWithCallback({ type: "nurture" });
      return;
    }
    if (stage === "dead") {
      setExpanded(false);
      setLostReason("");
      setInlineModeWithCallback({ type: "dead" });
      return;
    }
    if (stage === "funded") {
      setExpanded(false);
      setEntityName("");
      setEntityType("llc");
      setAmountInvested("");
      setInvestmentDate(getTodayCT());
      setTrack("maintain");
      setGrowthTarget("");
      setInlineModeWithCallback({ type: "funded" });
      return;
    }

    // Regular stage — show post-change prompt directly (no browser confirm)
    setExpanded(false);

    applyStageChange(stage).then(() => {
      setNextActionDetail(person.nextActionDetail ?? "");
      setNextActionDate(person.nextActionDate ?? "");
      setInlineModeWithCallback({ type: "post_change", newStage: stage });
    });
  }

  async function handleNurtureConfirm() {
    if (!reengageDate) return;
    setSaving(true);
    await fetch(`/api/persons/${personId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStage: "nurture", reengageDate }),
    });
    setSaving(false);
    setInlineModeWithCallback(null);
    router.refresh();
  }

  async function handleDeadConfirm() {
    if (!lostReason) return;
    setSaving(true);
    await fetch(`/api/persons/${personId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStage: "dead", lostReason }),
    });
    setSaving(false);
    setInlineModeWithCallback(null);
    router.refresh();
  }

  async function handleFundedConfirm() {
    if (!entityName || !entityType || !amountInvested || !investmentDate) return;
    setSaving(true);
    await fetch(`/api/persons/${personId}/funded-investment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityName,
        entityType,
        amountInvested: Number(amountInvested),
        investmentDate,
        track,
        growthTarget: track === "grow" && growthTarget ? Number(growthTarget) : null,
      }),
    });
    setSaving(false);
    setInlineModeWithCallback(null);
    router.refresh();
  }

  async function handlePostChangeConfirm() {
    if (!nextActionDetail.trim()) {
      setInlineModeWithCallback(null);
      router.refresh();
      return;
    }
    setSaving(true);
    await fetch(`/api/persons/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nextActionDetail: nextActionDetail.trim(),
        nextActionDate: nextActionDate || null,
      }),
    });
    setSaving(false);
    setInlineModeWithCallback(null);
    router.refresh();
  }

  function cancelInline() {
    setInlineModeWithCallback(null);
    if (!expanded) setExpanded(false);
  }

  const fundedFormValid =
    entityName.trim().length > 0 &&
    entityType.length > 0 &&
    amountInvested.trim().length > 0 &&
    investmentDate.length > 0;

  return (
    <div>
      {/* Dot progression */}
      <div
        className="cursor-pointer group"
        onClick={() => !inlineMode && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-0 px-1">
          {PROGRESSION_STAGES.map((stage, idx) => {
            const isActive = stage === currentStage;
            const isPast = idx < currentIdx && !isSpecial;
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

        {/* Expand hint — invisible until hover */}
        {!inlineMode && (
          <p className="text-[9px] text-transparent group-hover:text-muted-foreground/40 transition-colors text-center mt-0.5 select-none">
            {expanded ? "collapse" : "change stage"}
          </p>
        )}
      </div>

      {/* Expanded stage picker */}
      {expanded && !inlineMode && (
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

      {/* ── Task 4: Nurture inline form ── */}
      {inlineMode?.type === "nurture" && (
        <div className="mt-3 rounded-lg border bg-card p-3 space-y-2.5">
          <p className="text-xs font-semibold text-navy">Move to Nurture</p>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1">Re-engage Date</label>
            <input
              type="date"
              value={reengageDate}
              onChange={(e) => setReengageDate(e.target.value)}
              className="rounded-md border bg-white px-2 py-1 text-xs w-full"
              disabled={saving}
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleNurtureConfirm}
              disabled={!reengageDate || saving}
              className="rounded-full bg-gold px-3 py-1 text-[10px] font-medium text-navy hover:bg-gold/90 disabled:opacity-40"
            >
              Move to Nurture
            </button>
            <button
              onClick={cancelInline}
              disabled={saving}
              className="text-xs text-muted-foreground hover:text-navy"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Task 5: Dead inline form ── */}
      {inlineMode?.type === "dead" && (
        <div className="mt-3 rounded-lg border bg-card p-3 space-y-2.5">
          <p className="text-xs font-semibold text-navy">Mark as Dead</p>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1">Lost Reason</label>
            <select
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="rounded-md border bg-white px-2 py-1 text-xs w-full"
              disabled={saving}
            >
              <option value="">— Select reason —</option>
              {LOST_REASONS.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleDeadConfirm}
              disabled={!lostReason || saving}
              className="rounded-full bg-alert-red px-3 py-1 text-[10px] font-medium text-white hover:bg-alert-red/90 disabled:opacity-40"
            >
              Mark as Dead
            </button>
            <button
              onClick={cancelInline}
              disabled={saving}
              className="text-xs text-muted-foreground hover:text-navy"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Task 7: Funded inline form ── */}
      {inlineMode?.type === "funded" && (
        <div className="mt-3 rounded-lg border bg-card p-3 space-y-2.5">
          <p className="text-xs font-semibold text-navy">Complete Funding</p>

          {/* Entity fields */}
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1">Entity Name</label>
            <input
              type="text"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              placeholder="Entity Name (e.g. Johnson Capital LLC)"
              className="rounded-md border bg-white px-2 py-1 text-xs w-full"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="rounded-md border bg-white px-2 py-1 text-xs w-full"
              disabled={saving}
            >
              <option value="llc">LLC</option>
              <option value="llp">LLP</option>
              <option value="trust">Trust</option>
              <option value="individual">Individual</option>
              <option value="corporation">Corporation</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Investment fields */}
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1">Amount Invested ($)</label>
            <input
              type="number"
              value={amountInvested}
              onChange={(e) => setAmountInvested(e.target.value)}
              placeholder="e.g. 250000"
              className="rounded-md border bg-white px-2 py-1 text-xs w-full"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1">Investment Date</label>
            <input
              type="date"
              value={investmentDate}
              onChange={(e) => setInvestmentDate(e.target.value)}
              className="rounded-md border bg-white px-2 py-1 text-xs w-full"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1">Track</label>
            <select
              value={track}
              onChange={(e) => setTrack(e.target.value as "maintain" | "grow")}
              className="rounded-md border bg-white px-2 py-1 text-xs w-full"
              disabled={saving}
            >
              <option value="maintain">Maintain</option>
              <option value="grow">Grow</option>
            </select>
          </div>
          {track === "grow" && (
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Growth Target ($)</label>
              <input
                type="number"
                value={growthTarget}
                onChange={(e) => setGrowthTarget(e.target.value)}
                placeholder="e.g. 500000"
                className="rounded-md border bg-white px-2 py-1 text-xs w-full"
                disabled={saving}
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleFundedConfirm}
              disabled={!fundedFormValid || saving}
              className="rounded-full bg-gold px-3 py-1 text-[10px] font-medium text-navy hover:bg-gold/90 disabled:opacity-40"
            >
              Complete Funding
            </button>
            <button
              onClick={cancelInline}
              disabled={saving}
              className="text-xs text-muted-foreground hover:text-navy"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Task 6: Post-stage-change prompt ── */}
      {inlineMode?.type === "post_change" && (
        <div className="mt-3 rounded-lg border bg-gold/10 border-gold/30 p-3 space-y-2.5">
          <p className="text-xs font-semibold text-navy">
            Update your plan for {STAGE_LABELS[inlineMode.newStage]}
          </p>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1">Next Action</label>
            <input
              type="text"
              value={nextActionDetail}
              onChange={(e) => setNextActionDetail(e.target.value)}
              placeholder="e.g. Send pitch deck follow-up"
              className="rounded-md border bg-white px-2 py-1 text-xs w-full"
              disabled={saving}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1">Due Date</label>
            <input
              type="date"
              value={nextActionDate}
              onChange={(e) => setNextActionDate(e.target.value)}
              className="rounded-md border bg-white px-2 py-1 text-xs w-full"
              disabled={saving}
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handlePostChangeConfirm}
              disabled={saving}
              className="rounded-full bg-gold px-3 py-1 text-[10px] font-medium text-navy hover:bg-gold/90 disabled:opacity-40"
            >
              Confirm
            </button>
            <button
              onClick={() => {
                setInlineModeWithCallback(null);
                router.refresh();
              }}
              disabled={saving}
              className="text-xs text-muted-foreground hover:text-navy"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
