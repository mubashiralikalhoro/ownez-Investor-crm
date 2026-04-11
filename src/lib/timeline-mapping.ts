/**
 * Pure mapping from Zoho's timeline-event shape into the internal `Activity`
 * shape used by the compact "Recent activity" list on the dashboard Log
 * Activity sheet.
 *
 * Source: GET /api/prospects/[id]/timeline → ZohoTimelineEvent[]
 * Target: Activity[] (consumed by ACTIVITY_TYPES-driven renderer)
 */

import type { ZohoTimelineEvent } from "@/types";
import type { Activity, ActivityType, ActivitySource } from "@/lib/types";

/** Zoho module api_name → local ActivityType. */
function kindForEvent(t: ZohoTimelineEvent): ActivityType {
  const mod = t.record?.module?.api_name;
  switch (mod) {
    case "Calls":  return "call";
    case "Emails": return "email";
    case "Events": return "meeting";
    case "Notes":  return "note";
    default:
      // Field updates, stage changes, automation — bucket as "note" for color;
      // the detail string makes the semantic obvious in the UI.
      if (t.action === "stage_change") return "stage_change";
      return "note";
  }
}

function shortDetail(t: ZohoTimelineEvent): string {
  if (t.record?.name) return t.record.name;
  if (t.field_history && t.field_history.length > 0) {
    const f = t.field_history[0];
    const oldVal = f._value?.old ?? "—";
    const newVal = f._value?.new ?? "—";
    return `${f.field_label}: ${oldVal} → ${newVal}`;
  }
  if (t.action) return t.action.replace(/_/g, " ");
  return "(activity)";
}

function mapSource(t: ZohoTimelineEvent): ActivitySource {
  return t.source === "crm_ui" ? "manual" : "o365_sync";
}

/** Map and take the first `limit` entries; caller expects them in API order. */
export function mapTimelineToActivities(
  events: ZohoTimelineEvent[],
  personId: string,
  limit = 5,
): Activity[] {
  return events.slice(0, limit).map((t) => {
    const iso  = t.audited_time || "";
    const date = iso.slice(0, 10);
    const time = iso.slice(11, 16) || null;
    return {
      id:                t.id,
      personId,
      activityType:      kindForEvent(t),
      source:            mapSource(t),
      date,
      time,
      outcome:           "connected",
      detail:            shortDetail(t),
      documentsAttached: [],
      loggedById:        t.done_by?.id ?? "",
      annotation:        null,
    };
  });
}
