"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Zap, Loader2, AlertCircle } from "lucide-react";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/format";
import { refreshZohoAccessToken } from "@/lib/auth-storage";
import type { RecentActivityEntry, User } from "@/lib/types";

function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
}

export function RecentActivity() {
  const [expanded, setExpanded] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activities, setActivities] = useState<RecentActivityEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [repFilter, setRepFilter] = useState<string>("all");

  async function fetchActivity(isRetry = false) {
    setFetching(true);
    setFetchError(null);

    const token = getToken();
    if (!token) { setFetchError("Session expired — please refresh."); setFetching(false); return; }

    try {
      const res = await fetch("/api/dashboard/activity", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "same-origin",
      });

      if (res.status === 401 && !isRetry) {
        const ok = await refreshZohoAccessToken();
        if (ok) { await fetchActivity(true); return; }
        setFetchError("Session expired — please refresh.");
        setFetching(false);
        return;
      }

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setFetchError(body.error ?? "Failed to load recent activity.");
        setFetching(false);
        return;
      }

      const json = await res.json() as { activities: RecentActivityEntry[]; users: User[] };
      setActivities(json.activities ?? []);
      setUsers(json.users ?? []);
      setFetched(true);
    } catch {
      setFetchError("Network error — could not load recent activity.");
    } finally {
      setFetching(false);
    }
  }

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    // Only fetch on first open
    if (next && !fetched && !fetching) {
      void fetchActivity();
    }
  }

  const filtered = repFilter === "all"
    ? activities
    : activities.filter((a) => a.loggedById === repFilter);

  return (
    <div>
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 text-lg font-semibold text-navy mb-3 hover:text-gold transition-colors"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Recent Activity
        {fetched && (
          <span className="text-sm font-normal text-muted-foreground">({activities.length})</span>
        )}
      </button>

      {expanded && (
        <div className="space-y-2">
          {/* Loading */}
          {fetching && (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin text-gold shrink-0" />
              Loading recent activity…
            </div>
          )}

          {/* Error */}
          {fetchError && !fetching && (
            <div className="flex items-center gap-2 rounded-lg border border-alert-red/25 bg-alert-red/5 px-4 py-3 text-sm text-alert-red">
              <AlertCircle size={15} className="shrink-0" />
              {fetchError}
            </div>
          )}

          {/* Data */}
          {fetched && !fetching && (
            <>
              <div className="flex gap-2">
                <select
                  value={repFilter}
                  onChange={(e) => setRepFilter(e.target.value)}
                  className="rounded-md border bg-card px-2 py-1 text-sm"
                >
                  <option value="all">All reps</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="overflow-hidden rounded-lg border bg-card">
                {filtered.length === 0 ? (
                  <p className="p-6 text-center text-base text-muted-foreground">No recent activity</p>
                ) : (
                  <div className="divide-y">
                    {filtered.map((activity) => {
                      const typeConfig = ACTIVITY_TYPES.find((t) => t.key === activity.activityType);
                      const logger = users.find((u) => u.id === activity.loggedById);
                      const isAuto = activity.source !== "manual";
                      const hasProspect = Boolean(activity.personId);

                      return (
                        <div key={activity.id} className="flex items-start gap-3 px-3 md:px-4 py-3">
                          <div
                            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-xs"
                            style={{ backgroundColor: typeConfig?.color ?? "#6b7280" }}
                          >
                            {typeConfig?.label?.[0] ?? "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* Top row: prospect name (clickable) + badges */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {hasProspect ? (
                                <Link
                                  href={`/prospect/${activity.personId}?from=dashboard`}
                                  className="text-sm font-semibold text-navy hover:text-gold transition-colors"
                                >
                                  {activity.personName}
                                </Link>
                              ) : (
                                activity.personName !== "—" && (
                                  <span className="text-sm font-semibold text-navy">
                                    {activity.personName}
                                  </span>
                                )
                              )}
                              <Badge variant="secondary" className="text-[10px] md:text-xs">
                                {typeConfig?.label ?? activity.activityType}
                              </Badge>
                              {activity.outcome === "attempted" && (
                                <Badge variant="outline" className="text-[10px] md:text-xs text-alert-red border-alert-red/30">
                                  Attempted
                                </Badge>
                              )}
                              {isAuto && (
                                <Badge variant="outline" className="text-[10px] md:text-xs text-gold border-gold/30">
                                  <Zap size={10} className="mr-0.5" />AUTO
                                </Badge>
                              )}
                            </div>
                            {/* Detail text */}
                            <p className="mt-0.5 text-xs md:text-sm text-muted-foreground line-clamp-2 md:truncate">
                              {activity.detail}
                            </p>
                            {/* Bottom row: date + logged-by */}
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] md:text-xs text-muted-foreground/70">
                                {formatDate(activity.date)}{activity.time ? ` · ${formatTime(activity.time)}` : ""}
                              </span>
                              {logger && (
                                <span className="text-[10px] md:text-xs text-muted-foreground/60">
                                  · {logger.fullName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
