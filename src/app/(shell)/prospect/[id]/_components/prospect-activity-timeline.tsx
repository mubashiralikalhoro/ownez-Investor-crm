"use client";

import { useCallback, useState } from "react";
import {
  ChevronDown, ChevronRight, CalendarDays, Loader2, AlertCircle,
} from "lucide-react";
import type {
  ZohoTimelineEvent, ZohoEmail, ZohoCall, ZohoEvent, ZohoVoiceCall,
} from "@/types";
import {
  type UnifiedActivity, buildUnifiedTimeline, groupByDate,
} from "./timeline-utils";
import {
  EntryRow, CallCardContent, VoiceCallCardContent, EmailCardContent,
  MeetingCardContent, NoteCardContent, ActivityLogTouchCardContent,
  ActivityLogCommitmentCardContent, TimelineCardContent,
} from "./timeline-cards";

const FILTER_OPTIONS = [
  { key: "all", label: "All" }, { key: "call", label: "Calls" },
  { key: "email", label: "Emails" }, { key: "meeting", label: "Meetings" },
  { key: "commitment", label: "Commitments" },
  { key: "stage_change", label: "Stage Changes" }, { key: "update", label: "Updates" },
  { key: "automation", label: "Automated" },
];

/**
 * Self-fetching Activity Timeline.
 * Data is loaded only when the section is first expanded — never on initial page load.
 */
export function ProspectActivityTimeline({ prospectId }: { prospectId: string }) {
  const [expanded,  setExpanded]  = useState(false);
  const [fetched,   setFetched]   = useState(false);
  const [fetching,  setFetching]  = useState(false);
  const [fetchErr,  setFetchErr]  = useState<string | null>(null);
  const [activities, setActivities] = useState<UnifiedActivity[]>([]);
  const [filter,    setFilter]    = useState("all");

  const loadData = useCallback(async () => {
    if (fetched || fetching) return;
    setFetching(true); setFetchErr(null);
    try {
      const [tlRes, emRes, caRes, evRes, vcRes] = await Promise.all([
        fetch(`/api/prospects/${prospectId}/timeline`,     { credentials: "same-origin" }),
        fetch(`/api/prospects/${prospectId}/emails`,       { credentials: "same-origin" }),
        fetch(`/api/prospects/${prospectId}/calls`,        { credentials: "same-origin" }),
        fetch(`/api/prospects/${prospectId}/events`,       { credentials: "same-origin" }),
        fetch(`/api/prospects/${prospectId}/voice-calls`,  { credentials: "same-origin" }),
      ]);

      // 401 → attempt token refresh once, then retry
      if (tlRes.status === 401) {
        const ok = (await fetch("/api/auth/zoho/refresh", { method: "POST", credentials: "same-origin" })).ok;
        if (!ok) { setFetchErr("Session expired. Please refresh the page."); return; }
        setFetched(false); setFetching(false);
        await loadData();
        return;
      }

      const safe = async <T,>(res: Response): Promise<T[]> =>
        res.ok ? ((await res.json()) as { data: T[] }).data ?? [] : [];

      const [tl, em, ca, ev, vc] = await Promise.all([
        safe<ZohoTimelineEvent>(tlRes),
        safe<ZohoEmail>(emRes),
        safe<ZohoCall>(caRes),
        safe<ZohoEvent>(evRes),
        safe<ZohoVoiceCall>(vcRes),
      ]);

      setActivities(buildUnifiedTimeline(tl, em, ca, ev, vc));
      setFetched(true);
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : "Failed to load timeline.");
    } finally {
      setFetching(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospectId, fetched, fetching]);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !fetched && !fetching) void loadData();
  };

  const counts = FILTER_OPTIONS.reduce<Record<string, number>>((acc, opt) => {
    acc[opt.key] = opt.key === "all" ? activities.length : activities.filter(a => a.kind === opt.key).length;
    return acc;
  }, {});
  const filtered = filter === "all" ? activities : activities.filter(a => a.kind === filter);
  const groups = groupByDate(filtered);

  return (
    <div>
      <button onClick={toggle} className="flex items-center gap-2 w-full text-left group">
        {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
        <CalendarDays size={14} className="text-navy shrink-0" />
        <h3 className="text-sm font-semibold text-navy">Activity Timeline</h3>
        {fetched && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            {activities.length} activit{activities.length !== 1 ? "ies" : "y"}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-3 pl-5">
          {/* Loading */}
          {fetching && (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin text-gold" />
              Loading timeline…
            </div>
          )}

          {/* Error */}
          {fetchErr && (
            <div className="flex items-center gap-2 py-4 text-sm text-alert-red">
              <AlertCircle size={14} className="shrink-0" />
              {fetchErr}
              <button
                onClick={() => { setFetched(false); void loadData(); }}
                className="ml-2 underline text-xs"
              >
                Retry
              </button>
            </div>
          )}

          {/* Data */}
          {fetched && !fetching && (
            <>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {FILTER_OPTIONS.map(opt => (
                  <button key={opt.key} onClick={() => setFilter(opt.key)}
                    className={`rounded-full px-3 py-1 text-[10px] font-medium transition-colors ${filter === opt.key ? "bg-navy text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {opt.label}
                    {opt.key !== "all" && (
                      <span className={`ml-1 ${counts[opt.key] > 0 ? "opacity-60" : "opacity-30"}`}>{counts[opt.key]}</span>
                    )}
                  </button>
                ))}
              </div>

              {filtered.length === 0
                ? <p className="py-6 text-center text-sm text-muted-foreground italic">No activity logged yet.</p>
                : <div>
                    {groups.map((group, gi) => {
                      const isLastGroup = gi === groups.length - 1;
                      return (
                        <div key={group.dateLabel}>
                          {/* Date header — connector line passes through (except first group) */}
                          <div className="relative flex items-center gap-3 pb-3">
                            {gi > 0 && (
                              <div
                                aria-hidden
                                className="absolute w-px bg-border"
                                style={{ left: 13.5, top: 0, bottom: 0 }}
                              />
                            )}
                            <div className="shrink-0" style={{ width: 28 }} />
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{group.dateLabel}</span>
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-[11px] text-muted-foreground/50 shrink-0">{group.items.length}</span>
                          </div>
                          <div>
                            {group.items.map((activity, idx) => {
                              const isLastInGroup = idx === group.items.length - 1;
                              const isLast = isLastGroup && isLastInGroup;
                              const card =
                                activity.activityLog && activity.kind === "commitment" ? <ActivityLogCommitmentCardContent activity={activity} /> :
                                activity.activityLog                                   ? <ActivityLogTouchCardContent       activity={activity} /> :
                                activity.kind === "call" && activity.voiceCall ? <VoiceCallCardContent activity={activity} /> :
                                activity.kind === "call"    ? <CallCardContent    activity={activity} /> :
                                activity.kind === "email"   ? <EmailCardContent   activity={activity} /> :
                                activity.kind === "meeting" ? <MeetingCardContent activity={activity} /> :
                                activity.kind === "note"    ? <NoteCardContent    activity={activity} /> :
                                                              <TimelineCardContent activity={activity} />;
                              return (
                                <EntryRow key={activity.id} activity={activity} isLast={isLast}>{card}</EntryRow>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
              }
            </>
          )}
        </div>
      )}
    </div>
  );
}
