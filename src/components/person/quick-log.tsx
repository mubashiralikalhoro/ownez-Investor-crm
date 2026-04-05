"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight } from "lucide-react";
import { detectActivityType, detectOutcome, hasOutcome } from "@/lib/smart-detection";
import { ACTIVITY_TYPES, NEXT_ACTION_TYPES } from "@/lib/constants";
import { getTodayCT } from "@/lib/format";
import { DateQuickPick } from "@/components/ui/date-quick-pick";
import { demoData } from "@/data/store";
import { STAGE_LABELS } from "@/lib/constants";
import type { PersonWithComputed, ActivityType, ActivityOutcome, PipelineStage } from "@/lib/types";

const DEMO_USER = "u-chad";

interface QuickLogProps {
  person: PersonWithComputed;
}

export function QuickLog({ person }: QuickLogProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>("note");
  const [date, setDate] = useState(getTodayCT());
  const [outcome, setOutcome] = useState<ActivityOutcome>("connected");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Next Action Prompt state
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptActionType, setPromptActionType] = useState(person.nextActionType ?? "follow_up");
  const [promptDetail, setPromptDetail] = useState("");
  const [promptDate, setPromptDate] = useState(person.nextActionDate ?? "");

  const detectedType = text ? detectActivityType(text) : "note";
  const detectedOutcome = text ? detectOutcome(text) : "connected";
  const displayType = showMore ? activityType : detectedType;
  const displayOutcome = showMore ? outcome : detectedOutcome;
  const typeConfig = ACTIVITY_TYPES.find((t) => t.key === displayType);

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);

    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "America/Chicago" });

      await demoData.createActivity(person.id, {
        activityType: displayType,
        source: "manual",
        date: date || getTodayCT(),
        time: currentTime,
        outcome: hasOutcome(displayType) ? displayOutcome : "connected",
        detail: text,
        documentsAttached: [],
        loggedById: DEMO_USER,
        annotation: null,
      });

      // Reset log form
      setText("");
      setShowMore(false);
      setActivityType("note");
      setOutcome("connected");
      setExpanded(false);

      // Show next action prompt — detail starts empty, old value as placeholder
      setShowPrompt(true);
      setPromptActionType(person.nextActionType ?? "follow_up");
      setPromptDetail("");
      setPromptDate(person.nextActionDate ?? "");

      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePromptConfirm() {
    await demoData.updatePerson(person.id, {
      nextActionType: promptActionType,
      nextActionDetail: promptDetail.trim() || person.nextActionDetail || "",
      nextActionDate: promptDate,
    });
    setShowPrompt(false);
    setShowSuccess(true);
    setTimeout(() => window.location.reload(), 1500);
  }

  async function handleAdvanceStage() {
    const stages = ["prospect", "initial_contact", "discovery", "pitch", "active_engagement", "soft_commit", "commitment_processing", "kyc_docs", "funded"];
    const currentIdx = stages.indexOf(person.pipelineStage ?? "");
    if (currentIdx >= 0 && currentIdx < stages.length - 1) {
      const nextStage = stages[currentIdx + 1];
      if (confirm(`Advance to ${nextStage.replace(/_/g, " ")}?`)) {
        const p = await demoData.getPerson(person.id);
        if (!p) return;
        const oldStage = p.pipelineStage;
        const today = getTodayCT();
        const timeStr = new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Chicago",
        });
        await demoData.updatePerson(person.id, {
          pipelineStage: nextStage as PipelineStage,
          stageChangedDate: today,
        });
        const oldLabel = oldStage ? STAGE_LABELS[oldStage] : "None";
        const newLabel = STAGE_LABELS[nextStage as PipelineStage] || nextStage;
        await demoData.createActivity(person.id, {
          activityType: "stage_change",
          source: "manual",
          date: today,
          time: timeStr,
          outcome: "connected",
          detail: `Stage updated from ${oldLabel} to ${newLabel}`,
          documentsAttached: [],
          loggedById: DEMO_USER,
          annotation: null,
        });
        window.location.reload();
      }
    }
  }

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

  if (showSuccess) {
    return (
      <div className="rounded-lg border border-healthy-green/30 bg-healthy-green-light px-3 py-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-healthy-green shrink-0" />
        <p className="text-sm font-medium text-healthy-green">Activity logged</p>
      </div>
    );
  }

  if (showPrompt) {
    return (
      <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 space-y-3">
        <p className="text-xs font-medium text-gold uppercase tracking-wider">Next Action</p>
        <div className="flex items-center gap-3">
          <select
            value={promptActionType}
            onChange={(e) => setPromptActionType(e.target.value as typeof promptActionType)}
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
            placeholder={person.nextActionDetail || "What needs to happen next?"}
            onKeyDown={(e) => { if (e.key === "Enter") handlePromptConfirm(); }}
            autoFocus
          />
        </div>
        <DateQuickPick value={promptDate} onChange={setPromptDate} />
        <div className="flex items-center justify-between">
          <button
            onClick={handleAdvanceStage}
            className="text-xs text-gold hover:underline"
          >
            Advance to next stage?
          </button>
          <button
            onClick={handlePromptConfirm}
            className="rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-navy hover:bg-gold-hover"
          >
            Confirm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-gold/30 bg-gold/5 px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-gold uppercase tracking-wider">Log Activity</p>
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
        placeholder={`Called ${person.fullName}, discussed...`}
        className="w-full text-sm h-9 bg-white border-gold/20 focus:border-gold"
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }}}
        disabled={submitting}
      />

      <div className="flex items-center justify-between">
        <div
          role="button"
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-navy cursor-pointer"
        >
          {showMore ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {showMore ? "Less" : "More options"}
        </div>

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
