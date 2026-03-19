"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, X } from "lucide-react";
import { detectActivityType, detectOutcome, hasOutcome } from "@/lib/smart-detection";
import { ACTIVITY_TYPES, STAGE_LABELS } from "@/lib/constants";
import { getTodayCT } from "@/lib/format";
import type { PipelineStage, ActivityType } from "@/lib/types";

interface LastViewedData {
  id: string;
  fullName: string;
  pipelineStage: PipelineStage | null;
  organizationName: string | null;
}

const STORAGE_KEY = "ownez-last-viewed";

export function setLastViewed(data: LastViewedData) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event("last-viewed-changed"));
  }
}

export function LastViewedBar() {
  const [data, setData] = useState<LastViewedData | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const load = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setData(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("last-viewed-changed", load);
    return () => window.removeEventListener("last-viewed-changed", load);
  }, [load]);

  const detectedType = text ? detectActivityType(text) : "note";
  const detectedOutcome = text ? detectOutcome(text) : "connected";
  const typeConfig = ACTIVITY_TYPES.find((t) => t.key === detectedType);

  async function handleSubmit() {
    if (!text.trim() || !data) return;
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
          personId: data.id,
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
      setShowLog(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } finally {
      setSubmitting(false);
    }
  }

  if (!data) return null;

  return (
    <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-2 px-3 md:px-8 py-1.5 text-xs">
        <span className="text-muted-foreground shrink-0">Last:</span>
        <Link
          href={`/person/${data.id}`}
          className="font-medium text-navy hover:text-gold transition-colors truncate"
        >
          {data.fullName}
        </Link>
        {data.organizationName && (
          <span className="text-muted-foreground hidden sm:inline truncate">
            · {data.organizationName}
          </span>
        )}
        {data.pipelineStage && (
          <Badge variant="secondary" className="text-[9px] shrink-0">
            {STAGE_LABELS[data.pipelineStage]}
          </Badge>
        )}

        {showSuccess && (
          <span className="text-healthy-green font-medium ml-auto shrink-0">Logged!</span>
        )}

        {!showLog && !showSuccess && (
          <button
            onClick={() => setShowLog(true)}
            className="ml-auto flex items-center gap-1 text-muted-foreground hover:text-gold transition-colors shrink-0"
          >
            <MessageSquare size={12} />
            <span className="hidden sm:inline">Quick log</span>
          </button>
        )}

        {showLog && (
          <div className="ml-auto flex items-center gap-1.5 flex-1 max-w-md">
            {text && typeConfig && (
              <Badge
                variant="secondary"
                className="text-[9px] text-white shrink-0"
                style={{ backgroundColor: typeConfig.color }}
              >
                {typeConfig.label}
              </Badge>
            )}
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Called ${data.fullName}...`}
              className="h-6 text-xs bg-white border-gold/20 focus:border-gold flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                if (e.key === "Escape") { setShowLog(false); setText(""); }
              }}
              disabled={submitting}
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !text.trim()}
              className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-medium text-navy hover:bg-gold-hover disabled:opacity-50 shrink-0"
            >
              Log
            </button>
            <button
              onClick={() => { setShowLog(false); setText(""); }}
              className="text-muted-foreground hover:text-navy shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
