"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/format";
import type { Activity, User } from "@/lib/types";

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "call", label: "Calls" },
  { key: "email", label: "Emails" },
  { key: "meeting", label: "Meetings" },
  { key: "note", label: "Notes" },
  { key: "document_sent", label: "Docs" },
  { key: "stage_change", label: "Stage Changes" },
  { key: "auto", label: "Auto" },
];

interface ActivityTimelineProps {
  activities: Activity[];
  users: User[];
}

export function ActivityTimeline({ activities, users }: ActivityTimelineProps) {
  const [filter, setFilter] = useState("all");

  const filtered = activities.filter((a) => {
    if (filter === "all") return true;
    if (filter === "auto") return a.source !== "manual";
    if (filter === "document_sent") return a.activityType === "document_sent" || a.activityType === "document_received";
    return a.activityType === filter;
  });

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-navy">Activity Timeline</h3>

      {/* Filter pills */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`rounded-full px-3 py-1 text-[10px] font-medium transition-colors ${
              filter === opt.key
                ? "bg-navy text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
            {opt.key === "auto" && " \u26A1"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground italic">
          No activity logged yet.
        </p>
      ) : (
        <div className="space-y-0">
          {filtered.map((activity) => {
            const typeConfig = ACTIVITY_TYPES.find((t) => t.key === activity.activityType);
            const logger = users.find((u) => u.id === activity.loggedById);
            const isAuto = activity.source !== "manual";
            const isStageChange = activity.activityType === "stage_change";

            if (isStageChange) {
              return (
                <div key={activity.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    \u27A1\uFE0F {activity.detail} &middot; {formatDate(activity.date)}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              );
            }

            return (
              <div key={activity.id} className="flex gap-3 py-3 border-b last:border-0">
                <div
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-medium"
                  style={{ backgroundColor: typeConfig?.color ?? "#6b7280" }}
                >
                  {typeConfig?.label?.[0] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(activity.date)} {formatTime(activity.time)}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {typeConfig?.label ?? activity.activityType}
                    </Badge>
                    {activity.outcome === "attempted" && (
                      <Badge variant="outline" className="text-[10px] text-alert-red border-alert-red/30">
                        Attempted
                      </Badge>
                    )}
                    {isAuto && (
                      <Badge variant="outline" className="text-[10px] text-gold border-gold/30">
                        <Zap size={8} className="mr-0.5" />AUTO
                      </Badge>
                    )}
                    {logger && (
                      <span className="text-[10px] text-muted-foreground/60">{logger.fullName}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-navy leading-relaxed">{activity.detail}</p>
                  {isAuto && !activity.annotation && (
                    <p className="mt-1 text-[10px] text-gold italic cursor-pointer hover:underline">
                      Add notes
                    </p>
                  )}
                  {activity.documentsAttached.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {activity.documentsAttached.map((doc) => (
                        <span key={doc} className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          \uD83D\uDCCE {doc}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
