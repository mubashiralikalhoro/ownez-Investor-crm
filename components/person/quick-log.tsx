"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight } from "lucide-react";
import { detectActivityType, detectOutcome } from "@/lib/smart-detection";
import { ACTIVITY_TYPES, NEXT_ACTION_TYPES } from "@/lib/constants";
import { getTodayCT } from "@/lib/format";
import { DateQuickPick } from "@/components/ui/date-quick-pick";
import type { PersonWithComputed, ActivityType, ActivityOutcome } from "@/lib/types";

interface QuickLogProps {
  person: PersonWithComputed;
}

export function QuickLog({ person }: QuickLogProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>("note");
  const [date, setDate] = useState(getTodayCT());
  const [time, setTime] = useState("");
  const [outcome, setOutcome] = useState<ActivityOutcome>("connected");
  const [submitting, setSubmitting] = useState(false);

  // Next Action Prompt state
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptActionType, setPromptActionType] = useState(person.nextActionType ?? "follow_up");
  const [promptDetail, setPromptDetail] = useState(person.nextActionDetail ?? "");
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
      const currentTime = time || now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "America/Chicago" });

      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: person.id,
          activityType: displayType,
          source: "manual",
          date: date || getTodayCT(),
          time: currentTime,
          outcome: displayOutcome,
          detail: text,
          documentsAttached: [],
          annotation: null,
        }),
      });

      // Reset log form
      setText("");
      setShowMore(false);
      setActivityType("note");
      setTime("");
      setOutcome("connected");

      // Show next action prompt
      setShowPrompt(true);
      setPromptActionType(person.nextActionType ?? "follow_up");
      setPromptDetail(person.nextActionDetail ?? "");
      setPromptDate(person.nextActionDate ?? "");

      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePromptConfirm() {
    await fetch(`/api/persons/${person.id}/next-action`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nextActionType: promptActionType,
        nextActionDetail: promptDetail,
        nextActionDate: promptDate,
      }),
    });
    setShowPrompt(false);
    router.refresh();
  }

  async function handleAdvanceStage() {
    const stages = ["prospect", "initial_contact", "discovery", "pitch", "active_engagement", "soft_commit", "commitment_processing", "kyc_docs", "funded"];
    const currentIdx = stages.indexOf(person.pipelineStage ?? "");
    if (currentIdx >= 0 && currentIdx < stages.length - 1) {
      const nextStage = stages[currentIdx + 1];
      if (confirm(`Advance to ${nextStage.replace(/_/g, " ")}?`)) {
        await fetch(`/api/persons/${person.id}/stage`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newStage: nextStage }),
        });
        router.refresh();
      }
    }
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
            className="flex-1 text-xs h-8"
            placeholder="What needs to happen next?"
            onKeyDown={(e) => { if (e.key === "Enter") handlePromptConfirm(); }}
            autoFocus
          />
        </div>
        <DateQuickPick value={promptDate} onChange={setPromptDate} />
        <div className="flex items-center justify-between">
          <button
            onClick={handleAdvanceStage}
            className="text-[10px] text-gold hover:underline"
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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {text && (
          <Badge
            variant="secondary"
            className="text-[10px] text-white shrink-0"
            style={{ backgroundColor: typeConfig?.color }}
          >
            {typeConfig?.label}
          </Badge>
        )}
        {text && displayOutcome === "attempted" && (
          <Badge variant="outline" className="text-[10px] text-alert-red border-alert-red/30 shrink-0">
            Attempted
          </Badge>
        )}
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Quick log: Called Robert, discussed..."
          className="flex-1 text-xs h-9"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }}}
          disabled={submitting}
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-navy"
        >
          {showMore ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          {showMore ? "Less" : "+ More options"}
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

      {showMore && (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
              className="rounded-md border bg-card px-2 py-1.5 text-xs"
            >
              {ACTIVITY_TYPES.filter((t) => !["stage_change", "reassignment"].includes(t.key)).map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border bg-card px-2 py-1 text-xs"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-md border bg-card px-2 py-1 text-xs"
            />
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as ActivityOutcome)}
              className="rounded-md border bg-card px-2 py-1.5 text-xs"
            >
              <option value="connected">Connected</option>
              <option value="attempted">Attempted</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
