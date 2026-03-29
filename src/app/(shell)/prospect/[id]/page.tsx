"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  Mail,
  Zap,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  CalendarDays,
  FileText,
  Pencil,
  ArrowRight,
  Bot,
  Plus,
  Cpu,
  Paperclip,
  CheckSquare,
  Clock,
  CheckCircle2,
  CircleDot,
  TrendingUp,
  DollarSign,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatRelativeDate, formatTime } from "@/lib/format";
import { refreshZohoAccessToken } from "@/lib/auth-storage";
import {
  PROSPECT_PROGRESSION_STAGES,
  PROSPECT_PROFILE_FIELDS,
  getProspectStageIndex,
  isSpecialProspectStage,
} from "@/lib/prospect-config";
import type {
  ZohoProspectDetail,
  ZohoNote,
  ZohoTimelineEvent,
  ZohoEmail,
  ZohoCall,
  ZohoEvent,
  ZohoStageHistory,
  ZohoAttachment,
  ZohoTask,
  ZohoFundedRecord,
} from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
}

function formatFieldValue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
  type: string
): string | null {
  if (value === null || value === undefined || value === "" || value === "-None-") return null;
  switch (type) {
    case "currency":   return typeof value === "number" ? formatCurrency(value) : null;
    case "integer_days": return typeof value === "number" ? `${value}d` : null;
    case "date":
    case "datetime":   return formatDate(value as string);
    case "owner":
    case "lookup":     return (value as { name: string }).name ?? null;
    case "boolean":    return (value as boolean) ? "Yes" : "No";
    default:           return String(value);
  }
}

function formatAuditedTime(iso: string): string {
  const d = new Date(iso);
  const timePart = d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
  return `${formatDate(iso)} ${formatTime(timePart)}`;
}

// ─── Unified Activity ─────────────────────────────────────────────────────────
// All activity sources merged into one sorted list.

type ActivityKind = "call" | "email" | "meeting" | "note" | "update" | "stage_change" | "automation";

interface UnifiedActivity {
  id: string;
  kind: ActivityKind;
  sortTime: number;  // ms epoch for sorting
  // raw data
  call?: ZohoCall;
  email?: ZohoEmail;
  event?: ZohoEvent;
  note?: ZohoNote;
  timeline?: ZohoTimelineEvent;
}

function buildUnifiedTimeline(
  timeline: ZohoTimelineEvent[],
  emails: ZohoEmail[],
  calls: ZohoCall[],
  events: ZohoEvent[],
): UnifiedActivity[] {
  const items: UnifiedActivity[] = [];

  timeline.forEach((t) => {
    const isStage = t.field_history?.some((f) => f.api_name === "Pipeline_Stage");
    const isAuto = t.source === "custom_function" || t.source === "workflow";
    const kind: ActivityKind = isStage ? "stage_change" : isAuto ? "automation" : "update";
    items.push({ id: `tl-${t.id}`, kind, sortTime: new Date(t.audited_time).getTime(), timeline: t });
  });

  emails.forEach((e) => {
    const ts = e.sent_time ?? e.date_time ?? null;
    items.push({ id: `em-${e.message_id}`, kind: "email", sortTime: ts ? new Date(ts).getTime() : 0, email: e });
  });

  calls.forEach((c) => {
    const ts = c.Call_Start_Time ?? c.Created_Time ?? null;
    items.push({ id: `ca-${c.id}`, kind: "call", sortTime: ts ? new Date(ts).getTime() : 0, call: c });
  });

  events.forEach((ev) => {
    const ts = ev.Start_DateTime ?? ev.Created_Time ?? null;
    items.push({ id: `ev-${ev.id}`, kind: "meeting", sortTime: ts ? new Date(ts).getTime() : 0, event: ev });
  });

  return items.sort((a, b) => b.sortTime - a.sortTime);
}

// Color per activity kind (matches ACTIVITY_TYPES in constants.ts)
const KIND_COLOR: Record<ActivityKind, string> = {
  call:         "#2563eb",  // blue — matches activity-call
  email:        "#7c3aed",  // purple — matches activity-email
  meeting:      "#0891b2",  // cyan — matches activity-meeting
  note:         "#6b7280",  // gray — matches activity-note
  update:       "#1e3a5f",  // navy for manual CRM
  stage_change: "#f59e0b",  // gold
  automation:   "#9ca3af",  // light gray
};

const KIND_LABEL: Record<ActivityKind, string> = {
  call:         "Call",
  email:        "Email",
  meeting:      "Meeting",
  note:         "Note",
  update:       "Updated",
  stage_change: "Stage Change",
  automation:   "Automation",
};

// Source pill metadata
const SOURCE_META: Record<string, { label: string; pill: string }> = {
  crm_ui:          { label: "CRM UI",    pill: "bg-navy/10 text-navy" },
  custom_function: { label: "Automation", pill: "bg-gold/15 text-gold" },
  workflow:        { label: "Workflow",   pill: "bg-blue-500/10 text-blue-600" },
  api:             { label: "API",        pill: "bg-muted text-muted-foreground" },
};

function getSourceMeta(source?: string) {
  return source ? (SOURCE_META[source] ?? { label: source, pill: "bg-muted text-muted-foreground" }) : null;
}

function getAutomationLabel(details: ZohoTimelineEvent["automation_details"]): string | null {
  if (!details) return null;
  if (details.type === "functions") return details.name;
  if (details.type === "workflow_rule") return details.rule.name;
  return null;
}

function formatTimelineFieldValue(value: string, dataType?: string): string {
  if (!value) return "—";
  if (dataType === "date") return formatDate(value);
  if (dataType === "currency") { const n = parseFloat(value); return isNaN(n) ? value : formatCurrency(n); }
  return value;
}

// ─── 1. Stage Bar (read-only, clickable to expand — same UX as person page) ──

function ProspectStageBar({ stage }: { stage: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const isSpecial = isSpecialProspectStage(stage);
  const currentIdx = getProspectStageIndex(stage);
  const specialMeta = isSpecial
    ? stage === "Dead / Lost"
      ? { label: "Dead / Lost", color: "text-alert-red" }
      : { label: "Nurture", color: "text-gold" }
    : null;

  return (
    <div className="px-4 pt-4 pb-2">
      {/* Dot progression — clickable (same as StageBar) */}
      <div className="cursor-pointer group" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-0 px-1">
          {PROSPECT_PROGRESSION_STAGES.map((s, idx) => {
            const isActive = s.value === stage;
            const isPast = !isSpecial && idx < currentIdx;
            const isLast = idx === PROSPECT_PROGRESSION_STAGES.length - 1;
            return (
              <div key={s.value} className="flex items-center flex-1">
                <div className="relative flex flex-col items-center">
                  <div className={`rounded-full transition-all ${
                    isActive
                      ? "h-3.5 w-3.5 bg-gold shadow-[0_0_0_3px_rgba(232,186,48,0.15)]"
                      : isPast
                      ? "h-2.5 w-2.5 bg-navy"
                      : "h-2.5 w-2.5 border-2 border-muted-foreground/25 bg-transparent"
                  }`} />
                  {isActive && !isSpecial && (
                    <span className="absolute top-5 whitespace-nowrap text-[10px] font-semibold text-navy">{s.label}</span>
                  )}
                </div>
                {!isLast && (
                  <div className={`flex-1 h-0.5 mx-0.5 ${isPast ? "bg-navy/30" : "bg-muted-foreground/15"}`} />
                )}
              </div>
            );
          })}
        </div>

        {specialMeta && <p className={`mt-1.5 text-[10px] font-semibold ${specialMeta.color}`}>{specialMeta.label}</p>}
        {!isSpecial && <div className="h-5" />}

        <p className="text-[9px] text-transparent group-hover:text-muted-foreground/40 transition-colors text-center mt-0.5 select-none">
          {expanded ? "collapse" : "view stages"}
        </p>
      </div>

      {/* Expanded stage list — read-only, matches person page StageBar expanded view */}
      {expanded && (
        <div className="mt-3 rounded-lg border bg-card p-3 space-y-1.5">
          {PROSPECT_PROGRESSION_STAGES.map((s, idx) => {
            const isActive = s.value === stage;
            const isPast = !isSpecial && idx < currentIdx;
            return (
              <div
                key={s.value}
                className={`w-full flex items-center gap-3 rounded-md px-3 py-2 ${
                  isActive ? "bg-gold text-navy" : isPast ? "bg-navy/5 text-navy" : "text-muted-foreground"
                }`}
              >
                <span className={`text-[10px] tabular-nums w-4 text-center shrink-0 ${isActive ? "font-bold" : "font-medium opacity-50"}`}>
                  {idx + 1}
                </span>
                <span className="text-xs font-medium">{s.label}</span>
                {isPast && <span className="ml-auto text-[10px] text-navy/40">✓</span>}
              </div>
            );
          })}
          {/* Special stages */}
          <div className="flex gap-1.5 pt-1.5 mt-1.5 border-t">
            <div className={`flex-1 rounded-md px-3 py-2 text-xs font-medium ${stage === "Nurture" ? "bg-gold text-navy" : "bg-muted text-muted-foreground"}`}>
              Nurture
            </div>
            <div className={`flex-1 rounded-md px-3 py-2 text-xs font-medium ${stage === "Dead / Lost" ? "bg-alert-red text-white" : "bg-muted text-muted-foreground"}`}>
              Dead / Lost
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 2. Identity Bar ──────────────────────────────────────────────────────────

function ProspectIdentityBar({ prospect }: { prospect: ZohoProspectDetail }) {
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = prospect.Next_Action_Date != null && prospect.Next_Action_Date < today;
  const isStale = (prospect.Days_Since_Last_Touch ?? 0) > 14;

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-lg md:text-xl font-semibold text-navy">{prospect.Name}</h1>
        {(isOverdue || isStale) && <span className="h-2.5 w-2.5 rounded-full bg-alert-red shrink-0" />}
        {prospect.Pipeline_Stage && (
          <Badge className="bg-gold/10 text-gold border-gold/20 text-[11px]">{prospect.Pipeline_Stage}</Badge>
        )}
        {prospect.Initial_Investment_Target && (
          <span className="text-sm font-medium tabular-nums text-muted-foreground">
            {formatCurrency(prospect.Initial_Investment_Target)}
          </span>
        )}
      </div>

      {prospect.Company_Entity && (
        <p className="mt-0.5 text-sm text-muted-foreground">{prospect.Company_Entity}</p>
      )}

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {prospect.Phone && (
          <a href={`tel:${prospect.Phone}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-navy/8 px-3 py-1.5 text-xs font-medium text-navy hover:bg-gold/20 transition-colors">
            <Phone size={12} />{prospect.Phone}
          </a>
        )}
        {prospect.Email && (
          <a href={`mailto:${prospect.Email}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-navy/8 px-3 py-1.5 text-xs font-medium text-navy hover:bg-gold/20 transition-colors">
            <Mail size={12} />{prospect.Email}
          </a>
        )}
      </div>
    </div>
  );
}

// ─── 3. Next Action Bar ───────────────────────────────────────────────────────

function ProspectNextActionBar({ prospect }: { prospect: ZohoProspectDetail }) {
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = prospect.Next_Action_Date != null && prospect.Next_Action_Date < today;
  const isStale = (prospect.Days_Since_Last_Touch ?? 0) > 14;
  const isUrgent = isOverdue || isStale;
  const hasAction = prospect.Next_Action || prospect.Next_Action_Date;

  if (!hasAction) {
    return (
      <div className="rounded-lg border border-dashed border-gold/30 bg-gold/5 px-3 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gold">Next Action</p>
        <p className="text-sm text-muted-foreground mt-1">No next action set.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {isUrgent && (
        <div className="rounded-t-lg bg-alert-red/8 border border-b-0 border-alert-red/15 px-3 py-1 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-alert-red shrink-0" />
          <span className="text-[11px] font-medium text-alert-red">
            {isOverdue ? formatRelativeDate(prospect.Next_Action_Date) : `Stale — ${prospect.Days_Since_Last_Touch}d idle`}
          </span>
        </div>
      )}
      <div className={`${isUrgent ? "rounded-b-lg border border-t-0 border-alert-red/15" : "rounded-lg border border-gold/15"} bg-gold/5 px-3 py-2`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gold">Next Action</p>
            <p className="text-sm font-semibold text-navy">{prospect.Next_Action ?? "—"}</p>
          </div>
          {!isUrgent && prospect.Next_Action_Date && (
            <span className="text-xs font-medium text-navy shrink-0">{formatRelativeDate(prospect.Next_Action_Date)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 4. Profile Card ──────────────────────────────────────────────────────────

function ProspectProfileCard({ prospect }: { prospect: ZohoProspectDetail }) {
  const financialFields = PROSPECT_PROFILE_FIELDS.filter((f) => f.section === "financials");
  const detailFields = PROSPECT_PROFILE_FIELDS.filter((f) => f.section === "details");
  const currentStage = prospect.Pipeline_Stage;

  return (
    <div className="rounded-lg border bg-card">
      <ProspectStageBar stage={currentStage} />

      <div className="px-4 pb-4 space-y-3">
        {/* Financials grid */}
        <div className="grid grid-cols-3 gap-4 pt-3 pb-2 border-t">
          {financialFields.map((field) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const raw = (prospect as any)[field.api_name];
            const formatted = formatFieldValue(raw, field.type);
            return (
              <div key={field.api_name}>
                <p className="text-[10px] text-muted-foreground tracking-wide mb-0.5">{field.label}</p>
                {formatted
                  ? <p className="text-sm font-semibold text-navy tabular-nums">{formatted}</p>
                  : <p className="text-xs text-muted-foreground/40 italic">Not set</p>}
              </div>
            );
          })}
        </div>

        {/* Detail rows */}
        {detailFields.map((field) => {
          if (field.showForStages && currentStage && !field.showForStages.includes(currentStage)) return null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const raw = (prospect as any)[field.api_name];
          const formatted = formatFieldValue(raw, field.type);
          if (!formatted) return null;
          return (
            <div key={field.api_name} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-28 shrink-0 tracking-wide">{field.label}</span>
              <span className="text-xs font-medium text-navy flex-1">{formatted}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 5. Unified Activity Timeline ─────────────────────────────────────────────

const FILTER_OPTIONS = [
  { key: "all",          label: "All" },
  { key: "call",         label: "Calls" },
  { key: "email",        label: "Emails" },
  { key: "meeting",      label: "Meetings" },
  { key: "stage_change", label: "Stage Changes" },
  { key: "update",       label: "Updates" },
  { key: "automation",   label: "Automated" },
];

// Icon per kind — used inside colored dot
const KIND_ICON: Record<ActivityKind, React.ReactNode> = {
  call:         <Phone size={12} />,
  email:        <Mail size={12} />,
  meeting:      <CalendarDays size={12} />,
  note:         <FileText size={12} />,
  update:       <Pencil size={12} />,
  stage_change: <ArrowRight size={12} />,
  automation:   <Bot size={12} />,
};

function ActivityIcon({ kind }: { kind: ActivityKind }) {
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ring-2 ring-background"
      style={{ backgroundColor: KIND_COLOR[kind] }}
    >
      {KIND_ICON[kind]}
    </div>
  );
}

/** Format just the time portion (e.g. "6:00 AM") from an ISO timestamp. */
function formatTimeOnly(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

/** Group activities into [{dateLabel, items}] newest-date-first. */
function groupByDate(activities: UnifiedActivity[]): { dateLabel: string; items: UnifiedActivity[] }[] {
  const map = new Map<string, UnifiedActivity[]>();
  for (const a of activities) {
    const d = new Date(a.sortTime);
    // Stable key: YYYY-MM-DD in local time
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  const yesterdayKey = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, "0")}-${String(yest.getDate()).padStart(2, "0")}`;

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))          // newest date first
    .map(([key, items]) => ({
      dateLabel:
        key === todayKey ? "Today"
        : key === yesterdayKey ? "Yesterday"
        : new Date(key + "T12:00:00").toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric", year: "numeric",
          }),
      items,
    }));
}

// ── Entry row: icon + line (outside) + content card (inside) ─────────────────
// The icon circle and vertical connector live in the left gutter.
// Only the text/details content is inside the card.

function EntryRow({
  activity,
  isLast,
  children,
}: {
  activity: UnifiedActivity;
  isLast: boolean;
  children: React.ReactNode;
}) {
  const iconKind: ActivityKind =
    activity.timeline?.action === "added" ? "note"
    : activity.timeline?.action === "function_executed" ? "automation"
    : activity.kind;

  return (
    <div className="flex items-start gap-3">
      {/* Left gutter: icon circle + vertical connector line */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 28 }}>
        <ActivityIcon kind={iconKind} />
        {/* Line segment to the next item — hidden on last */}
        {!isLast && <div className="w-px flex-1 bg-border mt-1 min-h-[12px]" />}
      </div>

      {/* Content card — full width, no icon inside */}
      <div className={`flex-1 min-w-0 ${!isLast ? "mb-3" : ""}`}>
        {children}
      </div>
    </div>
  );
}

// ── Content-only card bodies (no icon, no wrapper div with gap) ───────────────

function CallCardContent({ activity }: { activity: UnifiedActivity }) {
  const c = activity.call!;
  const isInbound = c.Call_Type === "Inbound";
  const CallIcon = c.Call_Status === "Scheduled" ? PhoneCall : isInbound ? PhoneIncoming : PhoneOutgoing;
  const ts = c.Call_Start_Time ?? c.Created_Time;

  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-navy flex items-center gap-1.5">
          <CallIcon size={12} className="shrink-0" />
          {c.Call_Status === "Scheduled" ? "Scheduled Call" : `${c.Call_Type ?? ""} Call`}
        </span>
        {ts && <span className="text-[11px] text-muted-foreground">{formatTimeOnly(ts)}</span>}
        {c.Call_Status && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            c.Call_Status === "Completed" ? "bg-healthy-green/10 text-healthy-green" : "bg-gold/15 text-gold"
          }`}>{c.Call_Status}</span>
        )}
      </div>
      {c.Call_Agenda && <p className="mt-0.5 text-sm text-foreground/80">{c.Call_Agenda}</p>}
      {c.Call_Purpose && <p className="text-xs text-muted-foreground mt-0.5">{c.Call_Purpose}</p>}
      {c.Description && <p className="mt-1 text-xs text-muted-foreground italic">{c.Description}</p>}
      <div className="mt-1.5 flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
        {c.Owner && <span className="font-medium">{c.Owner.name}</span>}
        {c.Call_Duration && <span>· {c.Call_Duration}</span>}
      </div>
    </div>
  );
}

function EmailCardContent({ activity }: { activity: UnifiedActivity }) {
  const e = activity.email!;
  const ts = e.sent_time ?? e.date_time;

  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-navy truncate">{e.subject || "(No subject)"}</span>
        {ts && <span className="text-[11px] text-muted-foreground shrink-0">{formatTimeOnly(ts)}</span>}
      </div>
      {e.from && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          From: <span className="text-navy font-medium">{e.from.user_name}</span>{" "}
          <span className="opacity-60">&lt;{e.from.email}&gt;</span>
        </p>
      )}
      {e.to && e.to.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          To: {e.to.map((r) => r.user_name || r.email).join(", ")}
        </p>
      )}
      {e.summary && <p className="mt-1 text-[11px] text-muted-foreground italic line-clamp-2">{e.summary}</p>}
    </div>
  );
}

function MeetingCardContent({ activity }: { activity: UnifiedActivity }) {
  const ev = activity.event!;
  const ts = ev.Start_DateTime;

  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-navy">{ev.Event_Title || "Meeting"}</span>
        {ts && <span className="text-[11px] text-muted-foreground">{formatTimeOnly(ts)}</span>}
        {ev.End_DateTime && ts && (
          <span className="text-[11px] text-muted-foreground">– {formatTimeOnly(ev.End_DateTime)}</span>
        )}
      </div>
      {ev.Venue && <p className="mt-0.5 text-[11px] text-muted-foreground">📍 {ev.Venue}</p>}
      {ev.Description && <p className="mt-1 text-[11px] text-muted-foreground italic line-clamp-2">{ev.Description}</p>}
      {ev.Owner && <p className="mt-1 text-[11px] text-muted-foreground font-medium">{ev.Owner.name}</p>}
    </div>
  );
}

function NoteCardContent({ activity }: { activity: UnifiedActivity }) {
  const n = activity.note!;

  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-navy">{n.Note_Title || "Note"}</span>
        <span className="text-[11px] text-muted-foreground">{formatTimeOnly(n.Created_Time)}</span>
      </div>
      {n.Note_Content && (
        <p className="mt-0.5 text-sm text-foreground/80 leading-relaxed line-clamp-3">{n.Note_Content}</p>
      )}
      {n.Created_By && (
        <p className="mt-1.5 text-[11px] text-muted-foreground font-medium">{n.Created_By.name}</p>
      )}
    </div>
  );
}

function TimelineCardContent({ activity }: { activity: UnifiedActivity }) {
  const t = activity.timeline!;
  const isStageChange = activity.kind === "stage_change";
  const isAuto = activity.kind === "automation";
  const isFnExecuted = t.action === "function_executed";
  const sourceMeta = getSourceMeta(t.source);
  const automationLabel = getAutomationLabel(t.automation_details);

  const actionLabel =
    t.action === "added" ? "Record Created"
    : isFnExecuted ? "Function Executed"
    : t.action === "updated" ? "Updated"
    : t.action.charAt(0).toUpperCase() + t.action.slice(1);

  if (isStageChange && t.field_history) {
    const stageField = t.field_history.find((f) => f.api_name === "Pipeline_Stage");
    return (
      <div className="rounded-lg border bg-card px-3 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-navy">Stage Change</span>
          <span className="text-[11px] text-muted-foreground">{formatTimeOnly(t.audited_time)}</span>
          {sourceMeta && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sourceMeta.pill}`}>{sourceMeta.label}</span>}
        </div>
        {t.done_by && (
          <p className="mt-0.5 text-[11px] font-medium text-navy">
            {t.done_by.name}
            {t.done_by.profile && <span className="font-normal text-muted-foreground"> · {t.done_by.profile.name}</span>}
          </p>
        )}
        {stageField && (
          <div className="mt-1.5 inline-flex items-center gap-2 rounded-md border border-gold/20 bg-gold/5 px-2.5 py-1">
            <span className="text-xs text-muted-foreground line-through">{stageField._value.old ?? "—"}</span>
            <ArrowRight size={11} className="text-muted-foreground/50 shrink-0" />
            <span className="text-xs font-semibold text-navy">{stageField._value.new ?? "—"}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-navy">{actionLabel}</span>
        <span className="text-[11px] text-muted-foreground">{formatTimeOnly(t.audited_time)}</span>
        {sourceMeta && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sourceMeta.pill}`}>{sourceMeta.label}</span>}
      </div>
      {t.done_by && (
        <p className="mt-0.5 text-[11px] font-medium text-navy">
          {t.done_by.name}
          {t.done_by.profile && <span className="font-normal text-muted-foreground"> · {t.done_by.profile.name}</span>}
        </p>
      )}
      {isAuto && automationLabel && (
        <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-gold font-medium">
          <Zap size={9} />{automationLabel}
        </div>
      )}
      {isFnExecuted && t.record?.name && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          <span className="font-medium text-navy/70">fn:</span> {t.record.name}
        </p>
      )}
      {t.field_history && t.field_history.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5 rounded-md bg-muted/40 px-2.5 py-2">
          {t.field_history.map((fh) => (
            <div key={fh.id} className="flex items-start gap-2 text-xs">
              <span className="font-medium text-navy/70 shrink-0 min-w-[110px]">{fh.field_label}</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-muted-foreground line-through">
                  {fh._value.old !== null ? formatTimelineFieldValue(fh._value.old, fh.data_type) : "—"}
                </span>
                <span className="text-muted-foreground/40">→</span>
                <span className="font-medium text-navy">
                  {fh._value.new !== null ? formatTimelineFieldValue(fh._value.new, fh.data_type) : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProspectActivityTimeline({ activities }: { activities: UnifiedActivity[] }) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState("all");

  const counts = FILTER_OPTIONS.reduce<Record<string, number>>((acc, opt) => {
    acc[opt.key] = opt.key === "all" ? activities.length : activities.filter((a) => a.kind === opt.key).length;
    return acc;
  }, {});

  const filtered = filter === "all" ? activities : activities.filter((a) => a.kind === filter);
  const groups = groupByDate(filtered);

  return (
    <div>
      {/* Collapsible header — same pattern as Stage History */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
        <CalendarDays size={14} className="text-navy shrink-0" />
        <h3 className="text-sm font-semibold text-navy">Activity Timeline</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{activities.length} activit{activities.length !== 1 ? "ies" : "y"}</span>
      </button>

      {expanded && (
        <div className="mt-3 pl-5">
          {/* Filter pills — always show all */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`rounded-full px-3 py-1 text-[10px] font-medium transition-colors ${
                  filter === opt.key ? "bg-navy text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {opt.label}
                {opt.key !== "all" && (
                  <span className={`ml-1 ${counts[opt.key] > 0 ? "opacity-60" : "opacity-30"}`}>{counts[opt.key]}</span>
                )}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground italic">No activity logged yet.</p>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.dateLabel}>
                  {/* Date section header */}
                  <div className="flex items-center gap-3 mb-3 pl-[40px]">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {group.dateLabel}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] text-muted-foreground/50 shrink-0">{group.items.length}</span>
                  </div>

                  {/* Icon + line + card rows */}
                  <div>
                    {group.items.map((activity, idx) => {
                      const isLast = idx === group.items.length - 1;
                      const card =
                        activity.kind === "call"    ? <CallCardContent    activity={activity} /> :
                        activity.kind === "email"   ? <EmailCardContent   activity={activity} /> :
                        activity.kind === "meeting" ? <MeetingCardContent activity={activity} /> :
                        activity.kind === "note"    ? <NoteCardContent    activity={activity} /> :
                                                      <TimelineCardContent activity={activity} />;

                      return (
                        <EntryRow key={activity.id} activity={activity} isLast={isLast}>
                          {card}
                        </EntryRow>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 6. Notes Section (right column) ─────────────────────────────────────────

function ProspectNotesSection({ notes }: { notes: ZohoNote[] }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 w-full text-left group">
        {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
        <h3 className="text-sm font-semibold text-navy">Notes</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{notes.length}</span>
      </button>
      {expanded && (
        <div className="mt-3 space-y-3 pl-5">
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No notes yet.</p>
          ) : notes.map((note) => (
            <div key={note.id} className="rounded-md border bg-card px-3 py-2.5">
              {note.Note_Title && <p className="text-xs font-semibold text-navy mb-1">{note.Note_Title}</p>}
              {note.Note_Content && <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">{note.Note_Content}</p>}
              <div className="flex items-center justify-between mt-2 pt-1.5 border-t">
                <span className="text-[10px] text-muted-foreground">{note.Created_By?.name ?? "—"}</span>
                <span className="text-[10px] text-muted-foreground">{formatDate(note.Created_Time)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 7. Record Info (right column) ───────────────────────────────────────────

function ProspectRecordInfo({ prospect }: { prospect: ZohoProspectDetail }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-navy transition-colors">
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Record Info
      </button>
      {expanded && (
        <div className="mt-2 space-y-1.5 text-xs text-muted-foreground pl-5">
          <p><span className="font-medium text-navy/60">Zoho ID:</span> <span className="font-mono">{prospect.id}</span></p>
          {prospect.Owner.email && <p><span className="font-medium text-navy/60">Owner email:</span> {prospect.Owner.email}</p>}
          <p><span className="font-medium text-navy/60">Stale flag:</span> {prospect.Stale_Flag ? "Yes" : "No"}</p>
          <p><span className="font-medium text-navy/60">Archived:</span> {prospect.isArchived ? "Yes" : "No"}</p>
          {prospect.Record_Status__s && <p><span className="font-medium text-navy/60">Record status:</span> {prospect.Record_Status__s}</p>}
          {prospect.Currency && <p><span className="font-medium text-navy/60">Currency:</span> {prospect.Currency}</p>}
        </div>
      )}
    </div>
  );
}

// ─── 8. Pipeline Stage History ───────────────────────────────────────────────

function ProspectStageHistorySection({ history }: { history: ZohoStageHistory[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
        <TrendingUp size={14} className="text-gold shrink-0" />
        <h3 className="text-sm font-semibold text-navy">Pipeline Stage History</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{history.length} record{history.length !== 1 ? "s" : ""}</span>
      </button>
      {expanded && (
        <div className="mt-3 pl-5">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No stage history.</p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-navy/70">Stage</th>
                    <th className="text-left px-3 py-2 font-semibold text-navy/70">Duration</th>
                    <th className="text-left px-3 py-2 font-semibold text-navy/70">Changed</th>
                    <th className="text-left px-3 py-2 font-semibold text-navy/70">By</th>
                    <th className="text-left px-3 py-2 font-semibold text-navy/70">Next Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2">
                        <span className="font-medium text-navy">{row.Pipeline_Stage ?? "—"}</span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.Duration_Days !== null && row.Duration_Days !== undefined
                          ? `${row.Duration_Days}d`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.Modified_Time ? formatDate(row.Modified_Time) : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.Modified_By?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.Next_Action
                          ? <span>{row.Next_Action}{row.Next_Action_Date ? <span className="ml-1 text-[10px] text-gold">({formatDate(row.Next_Action_Date)})</span> : null}</span>
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 9. Tasks (Open + Closed) ─────────────────────────────────────────────────

const TASK_STATUS_OPEN = new Set(["Not Started", "In Progress", "Waiting on input", "Deferred"]);

function taskPriorityColor(priority: string | null) {
  if (priority === "High") return "text-alert-red";
  if (priority === "Normal") return "text-gold";
  return "text-muted-foreground";
}

function ProspectTasksSection({ tasks }: { tasks: ZohoTask[] }) {
  const [expanded, setExpanded] = useState(true);
  const [showClosed, setShowClosed] = useState(false);

  const openTasks = tasks.filter((t) => TASK_STATUS_OPEN.has(t.Status ?? ""));
  const closedTasks = tasks.filter((t) => !TASK_STATUS_OPEN.has(t.Status ?? ""));

  const visibleTasks = showClosed ? closedTasks : openTasks;
  const label = showClosed ? "Closed Activities" : "Open Activities";

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
        <CheckSquare size={14} className="text-navy shrink-0" />
        <h3 className="text-sm font-semibold text-navy">Activities</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{openTasks.length} open · {closedTasks.length} closed</span>
      </button>
      {expanded && (
        <div className="mt-3 pl-5 space-y-3">
          {/* Toggle open / closed */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowClosed(false)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${!showClosed ? "bg-navy text-white border-navy" : "border-border text-muted-foreground hover:border-navy/40"}`}
            >
              Open ({openTasks.length})
            </button>
            <button
              onClick={() => setShowClosed(true)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${showClosed ? "bg-navy text-white border-navy" : "border-border text-muted-foreground hover:border-navy/40"}`}
            >
              Closed ({closedTasks.length})
            </button>
          </div>

          {visibleTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No {label.toLowerCase()}.</p>
          ) : (
            <div className="space-y-2">
              {visibleTasks.map((task) => (
                <div key={task.id} className="rounded-md border bg-card px-3 py-2.5 space-y-1">
                  <div className="flex items-start gap-2">
                    {showClosed
                      ? <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                      : <CircleDot size={13} className={`mt-0.5 shrink-0 ${taskPriorityColor(task.Priority)}`} />
                    }
                    <span className="text-xs font-medium text-navy leading-tight">{task.Subject ?? "Untitled Task"}</span>
                    {task.Priority && (
                      <span className={`ml-auto text-[10px] font-semibold shrink-0 ${taskPriorityColor(task.Priority)}`}>
                        {task.Priority}
                      </span>
                    )}
                  </div>
                  {task.Description && (
                    <p className="text-[11px] text-muted-foreground pl-5 leading-relaxed line-clamp-2">{task.Description}</p>
                  )}
                  <div className="flex items-center gap-3 pt-1 border-t mt-1.5 pl-5">
                    {task.Due_Date && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock size={10} />{formatDate(task.Due_Date)}
                      </span>
                    )}
                    {task.Closed_Time && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                        <CheckCircle2 size={10} />Closed {formatDate(task.Closed_Time)}
                      </span>
                    )}
                    {task.Owner && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                        <User size={10} />{task.Owner.name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 10. Attachments ─────────────────────────────────────────────────────────

function formatFileSize(sizeStr: string | null): string {
  if (!sizeStr) return "—";
  const bytes = parseInt(sizeStr, 10);
  if (isNaN(bytes) || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileExtension(name: string | null): string {
  if (!name) return "FILE";
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
}

function ProspectAttachmentsSection({
  attachments,
  prospectId,
}: {
  attachments: ZohoAttachment[];
  prospectId: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (att: ZohoAttachment) => {
    let token = getToken();
    if (!token) return;
    setDownloading(att.id);

    const doFetch = async (t: string) =>
      fetch(`/api/prospects/${prospectId}/attachments/${att.id}`, {
        headers: { Authorization: `Bearer ${t}` },
        credentials: "same-origin",
      });

    try {
      let res = await doFetch(token);

      // On 401 try refreshing the Zoho token once
      if (res.status === 401) {
        const refreshed = await refreshZohoAccessToken();
        if (!refreshed) { alert("Session expired. Please log in again."); return; }
        token = getToken() ?? token;
        res = await doFetch(token);
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string; detail?: string };
        alert(`Download failed: ${body.error ?? res.statusText}${body.detail ? `\n${body.detail}` : ""}`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.File_Name ?? att.id;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[download]", err);
      alert("Network error while downloading.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
        <Paperclip size={14} className="text-muted-foreground shrink-0" />
        <h3 className="text-sm font-semibold text-navy">Attachments</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{attachments.length}</span>
      </button>
      {expanded && (
        <div className="mt-3 pl-5 space-y-2">
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No attachments.</p>
          ) : attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5">
              <div className="shrink-0 w-8 h-8 rounded bg-muted flex items-center justify-center">
                <span className="text-[8px] font-bold text-muted-foreground">{fileExtension(att.File_Name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-navy truncate">{att.File_Name ?? "Unnamed file"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatFileSize(att.Size)} · {att.Created_By?.name ?? "—"} · {att.Created_Time ? formatDate(att.Created_Time) : "—"}
                </p>
              </div>
              <button
                onClick={() => handleDownload(att)}
                disabled={downloading === att.id}
                className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-navy hover:text-gold transition-colors disabled:opacity-50 border border-border rounded px-2 py-1"
                title="Download"
              >
                {downloading === att.id
                  ? <Loader2 size={10} className="animate-spin" />
                  : <Paperclip size={10} />
                }
                {downloading === att.id ? "…" : "Download"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 11. Funded Investor Records ──────────────────────────────────────────────

function ProspectFundedSection({ funded }: { funded: ZohoFundedRecord[] }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
        <DollarSign size={14} className="text-emerald-600 shrink-0" />
        <h3 className="text-sm font-semibold text-navy">Funded Investor Records</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{funded.length}</span>
      </button>
      {expanded && (
        <div className="mt-3 pl-5 space-y-2">
          {funded.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No funded investor records.</p>
          ) : funded.map((rec) => (
            <div key={rec.id} className="rounded-md border bg-card px-3 py-2.5 space-y-0.5">
              <p className="text-xs font-semibold text-navy">{rec.Name ?? "—"}</p>
              {rec.Email && <p className="text-[11px] text-muted-foreground">{rec.Email}</p>}
              {rec.Owner && <p className="text-[10px] text-muted-foreground">Owner: {rec.Owner.name}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProspectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id;

  // Resolve back-navigation label + path from the ?from= query param
  const fromParam = searchParams.get("from");
  const backNav: { label: string; href: string } =
    fromParam === "dashboard"
      ? { label: "Dashboard", href: "/" }
      : fromParam === "people"
      ? { label: "People", href: "/people" }
      : { label: "Pipeline", href: "/pipeline" };

  const [prospect, setProspect] = useState<ZohoProspectDetail | null>(null);
  const [notes, setNotes] = useState<ZohoNote[]>([]);
  const [timeline, setTimeline] = useState<ZohoTimelineEvent[]>([]);
  const [emails, setEmails] = useState<ZohoEmail[]>([]);
  const [calls, setCalls] = useState<ZohoCall[]>([]);
  const [events, setEvents] = useState<ZohoEvent[]>([]);
  const [stageHistory, setStageHistory] = useState<ZohoStageHistory[]>([]);
  const [attachments, setAttachments] = useState<ZohoAttachment[]>([]);
  const [tasks, setTasks] = useState<ZohoTask[]>([]);
  const [funded, setFunded] = useState<ZohoFundedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (isRetry = false) => {
    setLoading(true);
    setError(null);
    const token = getToken();
    if (!token) { router.replace("/login?error=Session+expired."); return; }
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [detailRes, notesRes, timelineRes, emailsRes, callsRes, eventsRes, stageHistoryRes, attachmentsRes, tasksRes, fundedRes] = await Promise.all([
        fetch(`/api/prospects/${id}`,               { headers, credentials: "same-origin" }),
        fetch(`/api/prospects/${id}/notes`,         { headers, credentials: "same-origin" }),
        fetch(`/api/prospects/${id}/timeline`,      { headers, credentials: "same-origin" }),
        fetch(`/api/prospects/${id}/emails`,        { headers, credentials: "same-origin" }),
        fetch(`/api/prospects/${id}/calls`,         { headers, credentials: "same-origin" }),
        fetch(`/api/prospects/${id}/events`,        { headers, credentials: "same-origin" }),
        fetch(`/api/prospects/${id}/stage-history`, { headers, credentials: "same-origin" }),
        fetch(`/api/prospects/${id}/attachments`,   { headers, credentials: "same-origin" }),
        fetch(`/api/prospects/${id}/tasks`,         { headers, credentials: "same-origin" }),
        fetch(`/api/prospects/${id}/funded`,        { headers, credentials: "same-origin" }),
      ]);

      if (detailRes.status === 401 && !isRetry) {
        const refreshed = await refreshZohoAccessToken();
        if (refreshed) return fetchAll(true);
        router.replace("/login?error=Session+expired.");
        return;
      }
      if (!detailRes.ok) {
        const body = (await detailRes.json()) as { error?: string };
        setError(body.error ?? "Failed to load prospect.");
        return;
      }

      const safe = async <T,>(res: Response, fallback: T): Promise<T> =>
        res.ok ? ((await res.json()) as { data: T }).data : fallback;

      const [detailData, notesData, timelineData, emailsData, callsData, eventsData, stageHistoryData, attachmentsData, tasksData, fundedData] = await Promise.all([
        (detailRes.json() as Promise<{ data: ZohoProspectDetail }>).then((j) => j.data),
        safe<ZohoNote[]>(notesRes, []),
        safe<ZohoTimelineEvent[]>(timelineRes, []),
        safe<ZohoEmail[]>(emailsRes, []),
        safe<ZohoCall[]>(callsRes, []),
        safe<ZohoEvent[]>(eventsRes, []),
        safe<ZohoStageHistory[]>(stageHistoryRes, []),
        safe<ZohoAttachment[]>(attachmentsRes, []),
        safe<ZohoTask[]>(tasksRes, []),
        safe<ZohoFundedRecord[]>(fundedRes, []),
      ]);

      setProspect(detailData);
      setNotes(notesData);
      setTimeline(timelineData);
      setEmails(emailsData);
      setCalls(callsData);
      setEvents(eventsData);
      setStageHistory(stageHistoryData);
      setAttachments(attachmentsData);
      setTasks(tasksData);
      setFunded(fundedData);
    } catch {
      setError("Network error — could not load prospect.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // Loading
  if (loading) {
    return (
      <div className="w-full">
        <div className="px-3 md:px-8 pt-3 md:pt-6">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="px-3 md:px-8 py-5 space-y-4">
          <div className="space-y-2">
            <div className="h-7 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-14 animate-pulse rounded-lg bg-muted" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-6 animate-pulse rounded bg-muted" />)}
          </div>
          <div className="flex items-center justify-center gap-3 pt-8">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error || !prospect) {
    return (
      <div className="w-full px-3 md:px-8 pt-8">
        <Link href="/pipeline" className="text-xs text-muted-foreground hover:text-gold transition-colors">&larr; Pipeline</Link>
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-alert-red/25 bg-alert-red-light px-4 py-3 text-sm text-alert-red max-w-md">
          <AlertCircle size={16} className="shrink-0" />{error ?? "Prospect not found."}
        </div>
      </div>
    );
  }

  const unifiedActivities = buildUnifiedTimeline(timeline, emails, calls, events);

  return (
    <div className="w-full overflow-x-hidden">
      {/* Back link */}
      <div className="px-3 md:px-8 pt-3 md:pt-6">
        <Link href={backNav.href} className="text-xs text-muted-foreground hover:text-gold transition-colors">
          &larr; {backNav.label}
        </Link>
      </div>

      {/* Cockpit Zone — sticky */}
      <div className="sticky top-[33px] z-10 bg-background border-b px-3 md:px-8 py-3 md:py-4 space-y-2 md:space-y-3 overflow-hidden">
        <ProspectIdentityBar prospect={prospect} />
        <ProspectNextActionBar prospect={prospect} />
      </div>

      {/* Detail Zone — scrollable */}
      <div className="px-3 md:px-8 py-4 md:py-6">
        <div className="flex flex-col lg:flex-row lg:gap-6">

          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-5">
            <ProspectProfileCard prospect={prospect} />
            <ProspectActivityTimeline activities={unifiedActivities} />
            <Separator />
            <ProspectStageHistorySection history={stageHistory} />
          </div>

          {/* Right column */}
          <div className="lg:w-[300px] xl:w-[340px] lg:shrink-0 mt-5 lg:mt-0 space-y-5">
            <ProspectNotesSection notes={notes} />
            <Separator />
            <ProspectTasksSection tasks={tasks} />
            <Separator />
            <ProspectAttachmentsSection attachments={attachments} prospectId={id} />
            <Separator />
            <ProspectFundedSection funded={funded} />
            <Separator />
            <ProspectRecordInfo prospect={prospect} />
          </div>
        </div>

        <Separator className="mt-5 lg:hidden" />
      </div>
    </div>
  );
}
