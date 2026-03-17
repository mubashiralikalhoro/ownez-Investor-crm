"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Zap } from "lucide-react";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/format";
import type { RecentActivityEntry, User } from "@/lib/types";

interface RecentActivityProps {
  activities: RecentActivityEntry[];
  users: User[];
}

export function RecentActivity({ activities, users }: RecentActivityProps) {
  const [expanded, setExpanded] = useState(false);
  const [repFilter, setRepFilter] = useState<string>("all");

  const filtered = repFilter === "all"
    ? activities
    : activities.filter((a) => a.loggedById === repFilter);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold text-navy mb-3 hover:text-gold transition-colors"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Recent Activity
        <span className="text-xs font-normal text-muted-foreground">({activities.length})</span>
      </button>

      {expanded && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              className="rounded-md border bg-card px-2 py-1 text-xs"
            >
              <option value="all">All reps</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-lg border bg-card">
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No recent activity</p>
            ) : (
              <div className="divide-y">
                {filtered.map((activity) => {
                  const typeConfig = ACTIVITY_TYPES.find((t) => t.key === activity.activityType);
                  const logger = users.find((u) => u.id === activity.loggedById);
                  const isAuto = activity.source !== "manual";

                  return (
                    <div key={activity.id} className="flex items-start gap-3 px-4 py-3">
                      <div
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-[10px]"
                        style={{ backgroundColor: typeConfig?.color ?? "#6b7280" }}
                      >
                        {typeConfig?.label?.[0] ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(activity.date)} {formatTime(activity.time)}
                          </span>
                          <Link
                            href={`/person/${activity.personId}`}
                            className="text-xs font-medium text-navy hover:text-gold transition-colors"
                          >
                            {activity.personName}
                          </Link>
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
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {activity.detail}
                        </p>
                        {logger && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                            {logger.fullName}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
