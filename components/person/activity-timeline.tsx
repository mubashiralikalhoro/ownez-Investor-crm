"use client";

import { useState } from "react";
import { Zap, Paperclip, ChevronDown, ChevronRight } from "lucide-react";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/format";
import type { Activity, User } from "@/lib/types";

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "call", label: "Calls" },
  { key: "email", label: "Emails" },
  { key: "meeting", label: "Meetings" },
  { key: "note", label: "Notes" },
];

interface ActivityTimelineProps {
  activities: Activity[];
  users: User[];
}

export function ActivityTimeline({ activities, users }: ActivityTimelineProps) {
  const [filter, setFilter] = useState("all");

  const filtered = activities.filter((a) => {
    if (filter === "all") return true;
    return a.activityType === filter;
  });

  // Stage changes always show regardless of filter
  const stageChanges = activities.filter((a) => a.activityType === "stage_change");
  const withStageChanges = filter === "all"
    ? filtered
    : [...filtered, ...stageChanges].sort(
        (a, b) => b.date.localeCompare(a.date) || (b.time ?? "").localeCompare(a.time ?? "")
      );

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
          </button>
        ))}
      </div>

      {withStageChanges.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground italic">
          No activity logged yet.
        </p>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[13px] top-3 bottom-3 w-0.5 bg-border" />

          <div className="space-y-0">
            {withStageChanges.map((activity) => {
              const typeConfig = ACTIVITY_TYPES.find((t) => t.key === activity.activityType);
              const logger = users.find((u) => u.id === activity.loggedById);
              const isAuto = activity.source !== "manual";
              const isStageChange = activity.activityType === "stage_change";

              if (isStageChange) {
                return (
                  <div key={activity.id} className="relative flex items-center py-2 pl-[28px]">
                    {/* Stage change dot on the line */}
                    <div className="absolute left-[10px] flex h-[10px] w-[10px] items-center justify-center rounded-full bg-muted-foreground/30 ring-2 ring-background" />
                    <span className="text-[10px] md:text-xs text-muted-foreground italic">
                      {activity.detail} · {formatDate(activity.date)}
                    </span>
                  </div>
                );
              }

              return (
                <TimelineEntry
                  key={activity.id}
                  activity={activity}
                  typeConfig={typeConfig}
                  logger={logger}
                  isAuto={isAuto}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineEntry({
  activity,
  typeConfig,
  logger,
  isAuto,
}: {
  activity: Activity;
  typeConfig: typeof ACTIVITY_TYPES[number] | undefined;
  logger: User | undefined;
  isAuto: boolean;
}) {
  const [docsExpanded, setDocsExpanded] = useState(false);
  const hasDocs = activity.documentsAttached.length > 0;

  return (
    <div className="relative flex gap-3 py-3 pl-0">
      {/* Dot on the timeline line */}
      <div
        className="relative z-10 mt-0.5 flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full text-white text-[10px] font-medium ring-2 ring-background"
        style={{ backgroundColor: typeConfig?.color ?? "#6b7280" }}
      >
        {typeConfig?.label?.[0] ?? "?"}
      </div>

      <div className="flex-1 min-w-0">
        {/* Line 1: type + date */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-navy">
            {typeConfig?.label ?? activity.activityType}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(activity.date)} {formatTime(activity.time)}
          </span>
        </div>

        {/* Line 2: detail */}
        <p className="mt-0.5 text-sm text-foreground/80 leading-relaxed">
          {activity.detail}
        </p>

        {/* Line 3: metadata — logger, attempted, auto, docs */}
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {logger && (
            <span className="text-xs text-muted-foreground" title={logger.fullName}>
              {logger.fullName.split(" ").map((n) => n[0]).join("")}
            </span>
          )}
          {activity.outcome === "attempted" && (
            <span className="text-[10px] font-medium text-alert-red">Attempted</span>
          )}
          {isAuto && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gold">
              <Zap size={9} />AUTO
            </span>
          )}
          {hasDocs && (
            <button
              onClick={() => setDocsExpanded(!docsExpanded)}
              className="inline-flex items-center gap-0.5 text-[10px] font-medium text-navy hover:text-gold transition-colors"
            >
              <Paperclip size={10} />
              {activity.documentsAttached.length} {activity.documentsAttached.length === 1 ? "file" : "files"}
              {docsExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>
          )}
        </div>

        {/* Expanded documents list */}
        {hasDocs && docsExpanded && (
          <div className="mt-2 flex flex-col gap-1 pl-1">
            {activity.documentsAttached.map((doc) => (
              <a
                key={doc}
                href="#"
                className="inline-flex items-center gap-1.5 text-xs text-navy hover:text-gold transition-colors"
                title={doc}
              >
                <Paperclip size={11} className="shrink-0 text-muted-foreground" />
                <span className="truncate">{doc}</span>
              </a>
            ))}
          </div>
        )}

        {/* Add notes prompt for auto-synced without annotation */}
        {isAuto && !activity.annotation && (
          <p className="mt-1 text-[10px] text-gold italic cursor-pointer hover:underline">
            Add notes
          </p>
        )}
      </div>
    </div>
  );
}
