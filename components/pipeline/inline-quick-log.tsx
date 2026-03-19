"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { detectActivityType, detectOutcome, hasOutcome } from "@/lib/smart-detection";
import { ACTIVITY_TYPES, NEXT_ACTION_TYPES } from "@/lib/constants";
import { getTodayCT } from "@/lib/format";
import { DateQuickPick } from "@/components/ui/date-quick-pick";
import type { PersonWithComputed, ActivityType, ActivityOutcome } from "@/lib/types";

interface InlineQuickLogProps {
  person: PersonWithComputed;
  onDone: () => void;
}

export function InlineQuickLog({ person, onDone }: InlineQuickLogProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"log" | "next-action" | "success">("log");

  // Next Action Prompt state
  const [promptActionType, setPromptActionType] = useState(person.nextActionType ?? "follow_up");
  const [promptDetail, setPromptDetail] = useState("");
  const [promptDate, setPromptDate] = useState(person.nextActionDate ?? "");

  const detectedType = text ? detectActivityType(text) : "note";
  const detectedOutcome = text ? detectOutcome(text) : "connected";
  const typeConfig = ACTIVITY_TYPES.find((t) => t.key === detectedType);

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);

    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("en-US", {
        hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "America/Chicago",
      });

      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: person.id,
          activityType: detectedType,
          source: "manual",
          date: getTodayCT(),
          time: currentTime,
          outcome: hasOutcome(detectedType) ? detectedOutcome : "connected",
          detail: text,
          documentsAttached: [],
          annotation: null,
        }),
      });

      setText("");
      setPhase("next-action");
      setPromptActionType(person.nextActionType ?? "follow_up");
      setPromptDetail("");
      setPromptDate(person.nextActionDate ?? "");
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
        nextActionDetail: promptDetail.trim() || person.nextActionDetail,
        nextActionDate: promptDate,
      }),
    });
    setPhase("success");
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  }

  if (phase === "success") {
    return (
      <tr>
        <td colSpan={12} className="px-4 py-2">
          <div className="rounded-lg border border-healthy-green/30 bg-healthy-green-light px-3 py-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-healthy-green shrink-0" />
            <p className="text-xs font-medium text-healthy-green">Activity logged</p>
          </div>
        </td>
      </tr>
    );
  }

  if (phase === "next-action") {
    return (
      <tr>
        <td colSpan={12} className="px-4 py-2">
          <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 space-y-2">
            <p className="text-[10px] font-semibold text-gold uppercase tracking-wider">Next Action for {person.fullName}</p>
            <div className="flex items-center gap-2 flex-wrap">
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
                className="flex-1 text-xs h-8 min-w-[200px] placeholder:text-muted-foreground/40 placeholder:italic"
                placeholder={person.nextActionDetail || "What needs to happen next?"}
                onKeyDown={(e) => { if (e.key === "Enter") handlePromptConfirm(); }}
                autoFocus
              />
            </div>
            <DateQuickPick value={promptDate} onChange={setPromptDate} />
            <div className="flex items-center justify-between">
              <button onClick={onDone} className="text-xs text-muted-foreground hover:text-navy">
                Skip
              </button>
              <button
                onClick={handlePromptConfirm}
                className="rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-navy hover:bg-gold-hover"
              >
                Confirm
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={12} className="px-4 py-2">
        <div className="rounded-lg border-2 border-gold/30 bg-gold/5 px-3 py-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-gold uppercase tracking-wider">
              Quick Log — {person.fullName}
            </p>
            <div className="flex items-center gap-1.5">
              {text && typeConfig && (
                <Badge
                  variant="secondary"
                  className="text-[10px] text-white shrink-0"
                  style={{ backgroundColor: typeConfig.color }}
                >
                  {typeConfig.label}
                </Badge>
              )}
              {text && hasOutcome(detectedType) && detectedOutcome === "attempted" && (
                <Badge variant="outline" className="text-[10px] text-alert-red border-alert-red/30 shrink-0">
                  Attempted
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Called ${person.fullName}, discussed...`}
              className="flex-1 text-xs h-8 bg-white border-gold/20 focus:border-gold"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                if (e.key === "Escape") onDone();
              }}
              disabled={submitting}
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !text.trim()}
              className="rounded-full bg-gold px-3 py-1.5 text-[10px] font-medium text-navy hover:bg-gold-hover disabled:opacity-50 whitespace-nowrap"
            >
              {submitting ? "..." : "Log"}
            </button>
            <button
              onClick={onDone}
              className="text-xs text-muted-foreground hover:text-navy"
            >
              Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
