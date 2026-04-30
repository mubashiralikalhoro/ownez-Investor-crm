"use client";

import React from "react";
import {
  Phone, Mail, Zap, PhoneCall, PhoneIncoming, PhoneOutgoing, CalendarDays,
  FileText, Pencil, ArrowRight, CheckSquare, MessageSquare,
} from "lucide-react";
import { NoteContent } from "@/components/ui/note-editor";
import { formatDate } from "@/lib/format";
import {
  type ActivityKind, type UnifiedActivity, KIND_COLOR,
  getSourceMeta, getAutomationLabel, formatTimelineFieldValue,
  formatTimeOnly, formatDateTime,
} from "./timeline-utils";

const KIND_ICON: Record<ActivityKind, React.ReactNode> = {
  call: <Phone size={12} />, email: <Mail size={12} />, meeting: <CalendarDays size={12} />,
  note: <FileText size={12} />, update: <Pencil size={12} />, stage_change: <ArrowRight size={12} />,
  automation: <Zap size={12} />, commitment: <CheckSquare size={12} />, activity_log_touch: <MessageSquare size={12} />,
};

export function ActivityIcon({ kind }: { kind: ActivityKind }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ring-2 ring-background"
      style={{ backgroundColor: KIND_COLOR[kind] }}>
      {KIND_ICON[kind]}
    </div>
  );
}

export function EntryRow({ activity, isLast, children }: { activity: UnifiedActivity; isLast: boolean; children: React.ReactNode }) {
  const iconKind: ActivityKind =
    activity.timeline?.action === "added" ? "note"
    : activity.timeline?.action === "function_executed" ? "automation"
    : activity.kind;
  return (
    <div className={`relative flex items-start gap-3 ${!isLast ? "pb-3" : ""}`}>
      {!isLast && (
        <div
          aria-hidden
          className="absolute w-px bg-border"
          style={{ left: 13.5, top: 32, bottom: 0 }}
        />
      )}
      <div className="relative shrink-0" style={{ width: 28 }}>
        <ActivityIcon kind={iconKind} />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function CallCardContent({ activity }: { activity: UnifiedActivity }) {
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
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${c.Call_Status === "Completed" ? "bg-healthy-green/10 text-healthy-green" : "bg-gold/15 text-gold"}`}>
            {c.Call_Status}
          </span>
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

export function VoiceCallCardContent({ activity }: { activity: UnifiedActivity }) {
  const v = activity.voiceCall!;
  const isIncoming = v.call_type === "incoming";
  const isMissed = v.call_type === "missed";
  const CallIcon = isMissed ? PhoneCall : isIncoming ? PhoneIncoming : PhoneOutgoing;
  const ms = Number(v.start_time ?? 0);
  const ts = Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null;
  const label =
    isMissed ? "Missed Call" :
    isIncoming ? "Inbound Call" :
    v.call_type === "outgoing" ? "Outbound Call" :
    v.call_type === "bridged" ? "Bridged Call" :
    v.call_type === "forward" ? "Forwarded Call" :
    `Voice (${v.call_type})`;
  const statusPill = isMissed
    ? "bg-alert-red/10 text-alert-red"
    : v.hangup_cause === "NORMAL_CLEARING"
    ? "bg-healthy-green/10 text-healthy-green"
    : "bg-muted text-muted-foreground";
  const statusText = v.hangup_cause_displayname ?? v.hangup_cause ?? null;

  const fromLine = (v.caller_id_name && v.caller_id_name !== v.caller_id_number)
    ? `${v.caller_id_name} (${v.caller_id_number ?? "—"})`
    : (v.caller_id_number ?? "—");
  const toLine = (v.destination_name && v.destination_name !== v.destination_number)
    ? `${v.destination_name} (${v.destination_number ?? "—"})`
    : (v.destination_number ?? "—");

  const vmDuration = v.voicemail?.recording_duration;
  const transcriptionStatus = v.call_recording_transcription_status;
  const hasTranscription = transcriptionStatus && transcriptionStatus !== "not_initiated";

  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-navy flex items-center gap-1.5">
          <CallIcon size={12} className="shrink-0" />
          {label}
        </span>
        {ts && <span className="text-[11px] text-muted-foreground">{formatTimeOnly(ts)}</span>}
        <span className="rounded-full bg-blue-500/10 text-blue-600 px-2 py-0.5 text-[10px] font-medium">
          Zoho Voice
        </span>
        {statusText && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusPill}`}>
            {statusText}
          </span>
        )}
        {v.is_test_call && (
          <span className="rounded-full bg-gold/15 text-gold px-2 py-0.5 text-[10px] font-medium">Test</span>
        )}
        {v.is_bh_off_duty && (
          <span className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-medium">After hours</span>
        )}
        {v.isBlocked && (
          <span className="rounded-full bg-alert-red/10 text-alert-red px-2 py-0.5 text-[10px] font-medium">Blocked</span>
        )}
      </div>

      {/* Contact name */}
      {v.contact_name && (
        <p className="mt-1 text-sm text-foreground/80">{v.contact_name}</p>
      )}

      {/* From → To */}
      <div className="mt-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/70">{fromLine}</span>
        <span className="mx-1.5">→</span>
        <span className="font-medium text-foreground/70">{toLine}</span>
      </div>

      {/* Hangup detail (long form) */}
      {v.hangup_cause_description && v.hangup_cause_description !== statusText && (
        <p className="mt-1 text-[11px] text-muted-foreground italic">{v.hangup_cause_description}</p>
      )}

      {/* Voicemail block */}
      {v.voicemail?.recording_filename && (
        <div className="mt-1.5 rounded-md border border-blue-500/20 bg-blue-500/5 px-2 py-1 text-[11px] text-blue-700">
          Voicemail{vmDuration ? ` · ${vmDuration}s` : ""}
          {v.voicemail.content_type ? ` · ${v.voicemail.content_type}` : ""}
        </div>
      )}

      {/* Meta row */}
      <div className="mt-1.5 flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-muted-foreground">
        {v.agent_number && <span className="font-medium">Agent: {v.agent_number}</span>}
        {v.did_number && <span>· Line: {v.did_number}</span>}
        {v.duration && v.duration !== "00:00" && <span>· Duration: {v.duration}</span>}
        {v.department && <span>· Dept: {v.department}</span>}
        {v.disconnected_by && <span>· Ended by: {v.disconnected_by}</span>}
        {hasTranscription && <span>· Transcript: {transcriptionStatus}</span>}
        {v.feedback != null && <span>· Feedback: {v.feedback}/5</span>}
      </div>
    </div>
  );
}

export function EmailCardContent({ activity }: { activity: UnifiedActivity }) {
  const e = activity.email!;
  const ts = e.sent_time ?? e.date_time ?? e.time;
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-navy truncate">{e.subject || "(No subject)"}</span>
        {ts && <span className="text-[11px] text-muted-foreground shrink-0">{formatDateTime(ts)}</span>}
      </div>
      {e.from && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          From: <span className="text-navy font-medium">{e.from.user_name}</span>{" "}
          <span className="opacity-60">&lt;{e.from.email}&gt;</span>
        </p>
      )}
      {e.to && e.to.length > 0 && (
        <p className="text-[11px] text-muted-foreground">To: {e.to.map(r => r.user_name || r.email).join(", ")}</p>
      )}
      {e.summary && <p className="mt-1 text-[11px] text-muted-foreground italic line-clamp-2">{e.summary}</p>}
    </div>
  );
}

export function MeetingCardContent({ activity }: { activity: UnifiedActivity }) {
  const ev = activity.event!;
  const ts = ev.Start_DateTime;
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-navy">{ev.Event_Title || "Meeting"}</span>
        {ts && <span className="text-[11px] text-muted-foreground">{formatTimeOnly(ts)}</span>}
        {ev.End_DateTime && ts && <span className="text-[11px] text-muted-foreground">– {formatTimeOnly(ev.End_DateTime)}</span>}
      </div>
      {ev.Venue && <p className="mt-0.5 text-[11px] text-muted-foreground">📍 {ev.Venue}</p>}
      {ev.Description && <p className="mt-1 text-[11px] text-muted-foreground italic line-clamp-2">{ev.Description}</p>}
      {ev.Owner && <p className="mt-1 text-[11px] text-muted-foreground font-medium">{ev.Owner.name}</p>}
    </div>
  );
}

export function NoteCardContent({ activity }: { activity: UnifiedActivity }) {
  const n = activity.note!;
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-navy">{n.Note_Title || "Note"}</span>
        <span className="text-[11px] text-muted-foreground">{formatTimeOnly(n.Created_Time)}</span>
      </div>
      {n.Note_Content && (
        <div className="mt-0.5 line-clamp-3 overflow-hidden">
          <NoteContent html={n.Note_Content} />
        </div>
      )}
      {n.Created_By && <p className="mt-1.5 text-[11px] text-muted-foreground font-medium">{n.Created_By.name}</p>}
    </div>
  );
}

export function ActivityLogTouchCardContent({ activity }: { activity: UnifiedActivity }) {
  const al = activity.activityLog!;
  const typeLabel = al.Activity_Type.replace(/_/g, " ");
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-navy">{typeLabel}</span>
        <span className="text-[11px] text-muted-foreground">{al.Activity_Date}</span>
        {al.Outcome && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${al.Outcome === "connected" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
            {al.Outcome === "connected" ? "Connected" : "Attempted"}
          </span>
        )}
      </div>
      {al.Description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-3">{al.Description}</p>}
      {al.Owner && <p className="mt-1.5 text-[11px] text-muted-foreground font-medium">{al.Owner.name}</p>}
    </div>
  );
}

const COMMITMENT_STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  open:       { label: "Open",        badge: "bg-gold/15 text-gold" },
  fulfilled:  { label: "✓ Done",      badge: "bg-green-100 text-green-700" },
  superseded: { label: "↺ Replaced",  badge: "bg-muted text-muted-foreground" },
  cancelled:  { label: "✕ Cancelled", badge: "bg-red-100 text-red-600" },
};

export function ActivityLogCommitmentCardContent({ activity }: { activity: UnifiedActivity }) {
  const al = activity.activityLog!;
  const status = al.Commitment_Status ?? "open";
  const statusCfg = COMMITMENT_STATUS_CONFIG[status] ?? COMMITMENT_STATUS_CONFIG.open;
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-navy italic">Next Action Set</span>
        {al.Commitment_Type && (
          <span className="text-[11px] font-medium text-navy/70">{al.Commitment_Type}</span>
        )}
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCfg.badge}`}>{statusCfg.label}</span>
      </div>
      {al.Commitment_Detail && <p className="mt-0.5 text-xs text-navy/80">{al.Commitment_Detail}</p>}
      {al.Commitment_Due_Date && (
        <p className="mt-1 text-[11px] text-muted-foreground">Due: {formatDate(al.Commitment_Due_Date)}</p>
      )}
      {al.Owner && <p className="mt-1 text-[11px] text-muted-foreground font-medium">{al.Owner.name}</p>}
    </div>
  );
}

export function TimelineCardContent({ activity }: { activity: UnifiedActivity }) {
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
    const stageField  = t.field_history.find(f => f.api_name === "Pipeline_Stage");
    const reasonField = t.field_history.find(f => f.api_name === "Lost_Dead_Reason");
    const otherFields = t.field_history.filter(
      f => f.api_name !== "Pipeline_Stage" && f.api_name !== "Lost_Dead_Reason",
    );
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
            <span className="text-xs text-muted-foreground line-through">{stageField._value?.old ?? "—"}</span>
            <ArrowRight size={11} className="text-muted-foreground/50 shrink-0" />
            <span className="text-xs font-semibold text-navy">{stageField._value?.new ?? "—"}</span>
          </div>
        )}
        {reasonField?._value?.new && (
          <p className="mt-1.5 text-xs text-navy/80">
            <span className="font-medium text-muted-foreground">Reason:</span> {reasonField._value.new}
          </p>
        )}
        {otherFields.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5 rounded-md bg-muted/40 px-2.5 py-2">
            {otherFields.map(fh => {
              const oldVal = fh._value?.old ?? null;
              const newVal = fh._value?.new ?? null;
              return (
                <div key={fh.id} className="flex items-start gap-2 text-xs">
                  <span className="font-medium text-navy/70 shrink-0 min-w-[110px]">{fh.field_label}</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-muted-foreground line-through">
                      {oldVal !== null ? formatTimelineFieldValue(oldVal, fh.data_type) : "—"}
                    </span>
                    <ArrowRight size={11} className="text-muted-foreground/50 shrink-0" />
                    <span className="text-navy">
                      {newVal !== null ? formatTimelineFieldValue(newVal, fh.data_type) : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
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
      {t.field_history && t.field_history.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5 rounded-md bg-muted/40 px-2.5 py-2">
          {t.field_history.map(fh => {
            const oldVal = fh._value?.old ?? null;
            const newVal = fh._value?.new ?? null;
            return (
              <div key={fh.id} className="flex items-start gap-2 text-xs">
                <span className="font-medium text-navy/70 shrink-0 min-w-[110px]">{fh.field_label}</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-muted-foreground line-through">
                    {oldVal !== null ? formatTimelineFieldValue(oldVal, fh.data_type) : "—"}
                  </span>
                  <span className="text-muted-foreground/40">→</span>
                  <span className="font-medium text-navy">
                    {newVal !== null ? formatTimelineFieldValue(newVal, fh.data_type) : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
