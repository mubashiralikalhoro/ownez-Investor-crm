import { formatCurrency, formatDate } from "@/lib/format";
import type {
  ZohoTimelineEvent, ZohoEmail, ZohoCall, ZohoEvent, ZohoNote,
  ZohoActivityLog, ZohoVoiceCall,
} from "@/types";

// ─── Unified Activity ─────────────────────────────────────────────────────────

export type ActivityKind = "call" | "email" | "meeting" | "note" | "update" | "stage_change" | "automation" | "commitment" | "activity_log_touch";

export interface UnifiedActivity {
  id: string;
  kind: ActivityKind;
  sortTime: number;
  call?: ZohoCall;
  voiceCall?: ZohoVoiceCall;
  email?: ZohoEmail;
  event?: ZohoEvent;
  note?: ZohoNote;
  timeline?: ZohoTimelineEvent;
  activityLog?: ZohoActivityLog;
}

export function buildUnifiedTimeline(
  timeline: ZohoTimelineEvent[], emails: ZohoEmail[],
  calls: ZohoCall[], events: ZohoEvent[],
  voiceCalls: ZohoVoiceCall[] = [],
): UnifiedActivity[] {
  const items: UnifiedActivity[] = [];

  timeline.forEach((t) => {
    if (t._activityLog) {
      const al = t._activityLog;
      const isCommitment = al.Activity_Type === "Commitment_Set";
      const typeToKind: Record<string, ActivityKind> = {
        Call: "call", Email: "email", Meeting: "meeting", Note: "note",
      };
      const kind: ActivityKind = isCommitment
        ? "commitment"
        : (typeToKind[al.Activity_Type] ?? "activity_log_touch");
      const sortTime = al.Created_Time
        ? new Date(al.Created_Time).getTime()
        : new Date(t.audited_time).getTime();
      items.push({ id: `tl-${t.id}`, kind, sortTime, timeline: t, activityLog: al });
      return;
    }
    const isStage = t.field_history?.some((f) => f.api_name === "Pipeline_Stage");
    const isAuto = t.source === "custom_function" || t.source === "workflow";
    const kind: ActivityKind = isStage ? "stage_change" : isAuto ? "automation" : "update";
    items.push({ id: `tl-${t.id}`, kind, sortTime: new Date(t.audited_time).getTime(), timeline: t });
  });
  emails.forEach((e) => {
    const iso = e.sent_time ?? e.date_time ?? e.time ?? null;
    const parsed = iso ? new Date(iso).getTime() : NaN;
    const sortTime = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    items.push({ id: `em-${e.message_id}`, kind: "email", sortTime, email: e });
  });
  calls.forEach((c) => {
    const ts = c.Call_Start_Time ?? c.Created_Time ?? null;
    items.push({ id: `ca-${c.id}`, kind: "call", sortTime: ts ? new Date(ts).getTime() : 0, call: c });
  });
  voiceCalls.forEach((v) => {
    const ms = Number(v.start_time ?? 0);
    items.push({ id: `vc-${v.logid}`, kind: "call", sortTime: Number.isFinite(ms) ? ms : 0, voiceCall: v });
  });
  events.forEach((ev) => {
    const ts = ev.Start_DateTime ?? ev.Created_Time ?? null;
    items.push({ id: `ev-${ev.id}`, kind: "meeting", sortTime: ts ? new Date(ts).getTime() : 0, event: ev });
  });

  return items.sort((a, b) => b.sortTime - a.sortTime);
}

export const KIND_COLOR: Record<ActivityKind, string> = {
  call: "#2563eb", email: "#7c3aed", meeting: "#0891b2", note: "#6b7280",
  update: "#1e3a5f", stage_change: "#f59e0b", automation: "#9ca3af",
  commitment: "#d97706", activity_log_touch: "#059669",
};
export const KIND_LABEL: Record<ActivityKind, string> = {
  call: "Call", email: "Email", meeting: "Meeting", note: "Note",
  update: "Updated", stage_change: "Stage Change", automation: "Automation",
  commitment: "Commitment", activity_log_touch: "Activity",
};
const SOURCE_META: Record<string, { label: string; pill: string }> = {
  crm_ui: { label: "CRM UI", pill: "bg-navy/10 text-navy" },
  custom_function: { label: "Automation", pill: "bg-gold/15 text-gold" },
  workflow: { label: "Workflow", pill: "bg-blue-500/10 text-blue-600" },
  api: { label: "API", pill: "bg-muted text-muted-foreground" },
};

export function getSourceMeta(source?: string) {
  return source ? (SOURCE_META[source] ?? { label: source, pill: "bg-muted text-muted-foreground" }) : null;
}

export function getAutomationLabel(details: ZohoTimelineEvent["automation_details"]): string | null {
  if (!details) return null;
  if (details.type === "functions") return details.name;
  if (details.type === "workflow_rule") return details.rule.name;
  return null;
}

export function formatTimelineFieldValue(value: string, dataType?: string): string {
  if (!value) return "—";
  if (dataType === "date") return formatDate(value);
  if (dataType === "currency") { const n = parseFloat(value); return isNaN(n) ? value : formatCurrency(n); }
  return value;
}

export function formatTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  });
  const timePart = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
  });
  return `${datePart} · ${timePart}`;
}

/** YYYY-MM-DD day key in America/Chicago — use for date grouping. */
export function toCtDateKey(d: Date): string {
  // en-CA locale yields "YYYY-MM-DD" which is stable for keying.
  return d.toLocaleDateString("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

const UNKNOWN_DATE_KEY = "__unknown__";

export function groupByDate(activities: UnifiedActivity[]): { dateLabel: string; items: UnifiedActivity[] }[] {
  const map = new Map<string, UnifiedActivity[]>();
  for (const a of activities) {
    const key = a.sortTime > 0 ? toCtDateKey(new Date(a.sortTime)) : UNKNOWN_DATE_KEY;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  const now = new Date();
  const todayKey = toCtDateKey(now);
  const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = toCtDateKey(yest);
  return Array.from(map.entries())
    // Push the "unknown" bucket to the bottom, otherwise sort by key desc.
    .sort(([a], [b]) => {
      if (a === UNKNOWN_DATE_KEY) return 1;
      if (b === UNKNOWN_DATE_KEY) return -1;
      return b.localeCompare(a);
    })
    .map(([key, items]) => ({
      dateLabel:
        key === UNKNOWN_DATE_KEY
          ? "Undated"
          : key === todayKey
            ? "Today"
            : key === yesterdayKey
              ? "Yesterday"
              : new Date(key + "T12:00:00Z").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "America/Chicago",
                }),
      items,
    }));
}
