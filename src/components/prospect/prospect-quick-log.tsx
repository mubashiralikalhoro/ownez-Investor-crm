"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  detectActivityType,
  detectOutcome,
  hasOutcome,
} from "@/lib/smart-detection";
import {
  ACTIVITY_TYPES,
  NEXT_ACTION_TYPES,
  STAGE_LABELS,
} from "@/lib/constants";
import { getTodayCT } from "@/lib/format";
import { DateQuickPick } from "@/components/ui/date-quick-pick";
import {
  openCommitment,
  advanceProspectStage,
} from "@/lib/activity-dispatch";
import type { ActivityType, ActivityOutcome, PipelineStage } from "@/lib/types";

type AutoCloseResult = "fulfilled" | "cancelled" | null;

interface ProspectQuickLogProps {
  prospectId:           string;
  prospectName:         string;
  pipelineStage:        PipelineStage | null;
  nextActionType?:      string | null;
  nextActionDetail?:    string | null;
  nextActionDate?:      string | null;
  /**
   * Called when the prospect has changed server-side (after auto-close,
   * after commitment create) so the parent can re-fetch + re-render the
   * Next Action bar and anything else that reads from Prospect.*.
   */
  onRefresh?: () => void | Promise<void>;
  /**
   * Apply a local patch to the parent's prospect state without a network
   * round-trip. Used for the real-time Next Action bar update after
   * auto-close (where the prompt is still showing and we cannot afford a
   * loading-skeleton flicker that would unmount this widget).
   */
  onLocalSync?: (fields: Record<string, unknown>) => void;
  onDone?:    () => void;
}

export function ProspectQuickLog({
  prospectId,
  prospectName,
  pipelineStage,
  nextActionType,
  nextActionDetail,
  nextActionDate,
  onRefresh,
  onLocalSync,
  onDone,
}: ProspectQuickLogProps) {
  const router = useRouter();

  const [text,         setText]         = useState("");
  const [showMore,     setShowMore]     = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>("note");
  const [date,         setDate]         = useState(getTodayCT());
  const [outcome,      setOutcome]      = useState<ActivityOutcome>("connected");
  const [submitting,   setSubmitting]   = useState(false);
  const [confirming,   setConfirming]   = useState(false);
  const [expanded,     setExpanded]     = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [autoClose,    setAutoClose]    = useState<AutoCloseResult>(null);

  const [showPrompt,       setShowPrompt]       = useState(false);
  const [showSuccess,      setShowSuccess]      = useState(false);
  const [promptActionType, setPromptActionType] = useState(nextActionType ?? "Follow-up");
  const [promptDetail,     setPromptDetail]     = useState("");
  const [promptDate,       setPromptDate]       = useState(nextActionDate ?? "");

  const detectedType    = text ? detectActivityType(text) : "note";
  const detectedOutcome = text ? detectOutcome(text) : "connected";
  const displayType     = showMore ? activityType : detectedType;
  const displayOutcome  = showMore ? outcome : detectedOutcome;
  const typeConfig      = ACTIVITY_TYPES.find((t) => t.key === displayType);

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      // POST /activities — server auto-transitions the single open commitment
      // based on type match (fulfilled / cancelled / keep-open).
      const res = await fetch(`/api/prospects/${prospectId}/activities`, {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type:        displayType,
          description: text.trim(),
          outcome:     hasOutcome(displayType) ? displayOutcome : null,
          date:        date || getTodayCT(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const body = await res.json() as {
        data?: { id?: string; autoClose?: { closed: AutoCloseResult } };
      };
      const closed = body.data?.autoClose?.closed ?? null;
      setAutoClose(closed);

      // Reset log form
      setText("");
      setShowMore(false);
      setActivityType("note");
      setOutcome("connected");

      // Real-time Next Action bar update — server cleared
      // Prospect.Next_Action on auto-close, mirror that locally so the
      // bar re-renders immediately WITHOUT a full refetch (which would
      // flip loading=true and unmount this widget, losing the prompt).
      if (closed) {
        onLocalSync?.({ Next_Action: null, Next_Action_Date: null });
      }

      // Advance to Next Action prompt
      setPromptActionType(nextActionType ?? "Follow-up");
      setPromptDetail("");
      setPromptDate("");
      setShowPrompt(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to log activity.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePromptConfirm() {
    if (confirming) return;
    const detail = promptDetail.trim() || nextActionDetail || "";
    setConfirming(true);
    setError(null);

    try {
      if (detail && promptDate) {
        await openCommitment(prospectId, promptActionType, detail, promptDate);
        onLocalSync?.({ Next_Action: detail, Next_Action_Date: promptDate });
      }
      setShowPrompt(false);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setExpanded(false);
        setAutoClose(null);
        router.refresh();
        void onRefresh?.();
        onDone?.();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save next action.");
    } finally {
      setConfirming(false);
    }
  }

  async function handleAdvanceStage() {
    if (!pipelineStage) return;
    if (!confirm("Advance to next stage?")) return;
    try {
      await advanceProspectStage(prospectId, pipelineStage);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to advance stage.");
    }
  }

  // ── Collapsed pill ─────────────────────────────────────────────────────────
  if (!expanded && !showPrompt && !showSuccess) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full rounded-lg border border-dashed border-gold/25 px-3 py-2 text-xs text-muted-foreground/50 hover:border-gold/50 hover:text-gold transition-colors flex items-center gap-1.5"
      >
        <span className="text-sm font-light leading-none">+</span>
        Log Activity
      </button>
    );
  }

  // ── Success banner ─────────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <div className="rounded-lg border border-healthy-green/30 bg-healthy-green-light px-3 py-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-healthy-green shrink-0" />
        <p className="text-sm font-medium text-healthy-green">Activity logged</p>
      </div>
    );
  }

  // ── Next Action prompt ─────────────────────────────────────────────────────
  if (showPrompt) {
    return (
      <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 space-y-3">
        {autoClose && (
          <div
            className={
              autoClose === "fulfilled"
                ? "rounded-md border border-healthy-green/30 bg-healthy-green-light px-2.5 py-1.5 text-[11px] font-medium text-healthy-green"
                : "rounded-md border border-alert-red/25 bg-alert-red/5 px-2.5 py-1.5 text-[11px] font-medium text-alert-red"
            }
          >
            {autoClose === "fulfilled"
              ? "✓ Previous commitment auto-fulfilled (type matched)"
              : "✕ Previous commitment auto-cancelled (type mismatch)"}
          </div>
        )}
        <p className="text-xs font-medium text-gold uppercase tracking-wider">Next Action</p>
        <div className="flex items-center gap-3">
          <select
            value={promptActionType}
            onChange={(e) => setPromptActionType(e.target.value)}
            className="rounded-md border bg-card px-2 py-1.5 text-xs"
          >
            {NEXT_ACTION_TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <Input
            value={promptDetail}
            onChange={(e) => setPromptDetail(e.target.value)}
            className="flex-1 text-xs h-8 placeholder:text-muted-foreground/40 placeholder:italic"
            placeholder={nextActionDetail || "What needs to happen next?"}
            onKeyDown={(e) => { if (e.key === "Enter") handlePromptConfirm(); }}
            autoFocus
          />
        </div>
        <DateQuickPick value={promptDate} onChange={setPromptDate} />
        {error && <p className="text-xs text-alert-red">{error}</p>}
        <div className="flex items-center justify-between">
          <button
            onClick={handleAdvanceStage}
            className="text-xs text-gold hover:underline"
          >
            Advance to next stage?
          </button>
          <button
            onClick={handlePromptConfirm}
            disabled={confirming}
            className="rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-navy hover:bg-gold-hover disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {confirming ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    );
  }

  // ── Log Activity form ──────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border-2 border-gold/30 bg-gold/5 px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-gold uppercase tracking-wider">
          Log Activity{pipelineStage ? ` · ${STAGE_LABELS[pipelineStage]}` : ""}
        </p>
        {text && (
          <div className="flex items-center gap-1.5">
            <Badge
              variant="secondary"
              className="text-[10px] text-white shrink-0"
              style={{ backgroundColor: typeConfig?.color }}
            >
              {typeConfig?.label}
            </Badge>
            {hasOutcome(displayType) && displayOutcome === "attempted" && (
              <Badge variant="outline" className="text-[10px] text-alert-red border-alert-red/30 shrink-0">
                Attempted
              </Badge>
            )}
          </div>
        )}
      </div>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Called ${prospectName}, discussed...`}
        className="w-full text-sm h-9 bg-white border-gold/20 focus:border-gold"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        disabled={submitting}
        autoFocus
      />

      {error && <p className="text-xs text-alert-red">{error}</p>}

      <div className="flex items-center justify-between">
        <div
          role="button"
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-navy cursor-pointer"
        >
          {showMore ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {showMore ? "Less" : "More options"}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setExpanded(false); setText(""); setError(null); }}
            className="text-[10px] text-muted-foreground hover:text-navy"
          >
            Cancel
          </button>
          {text && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-full bg-gold px-3 py-1 text-[10px] font-medium text-navy hover:bg-gold-hover disabled:opacity-50"
            >
              {submitting ? "Logging..." : "Log Activity"}
            </button>
          )}
        </div>
      </div>

      {showMore && (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value as ActivityType)}
            className="rounded-md border bg-card px-2 py-1.5 text-xs"
          >
            {ACTIVITY_TYPES.filter((t) => !["stage_change", "reassignment"].includes(t.key)).map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          {hasOutcome(activityType) && (
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as ActivityOutcome)}
              className="rounded-md border bg-card px-2 py-1.5 text-xs"
            >
              <option value="connected">Connected</option>
              <option value="attempted">Attempted</option>
            </select>
          )}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border bg-card px-2 py-1.5 text-xs"
          />
        </div>
      )}
    </div>
  );
}

