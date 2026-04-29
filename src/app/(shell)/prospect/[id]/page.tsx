"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Phone, Mail, Zap, AlertCircle, Loader2, ChevronDown, ChevronRight,
  PhoneCall, PhoneIncoming, PhoneOutgoing, CalendarDays, FileText,
  Pencil, ArrowRight, Bot, Paperclip, CheckSquare, Clock,
  CheckCircle2, CircleDot, TrendingUp, DollarSign, User,
  X, Trash2, Upload, Check, Plus, MessageSquare,
} from "lucide-react";
import { ProspectDetailSkeleton } from "@/components/prospect/prospect-skeleton";
import { ProspectQuickLog } from "@/components/prospect/prospect-quick-log";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NoteEditor, NoteContent } from "@/components/ui/note-editor";
import { formatCurrency, formatDate, formatRelativeDate, formatTime } from "@/lib/format";
import {
  PROSPECT_PROGRESSION_STAGES,
  PROSPECT_SPECIAL_STAGES,
  PROSPECT_PROFILE_FIELDS,
  getProspectStageIndex,
  isSpecialProspectStage,
} from "@/lib/prospect-config";
import type {
  ZohoProspectDetail, ZohoNote, ZohoTimelineEvent, ZohoEmail,
  ZohoCall, ZohoEvent, ZohoStageHistory, ZohoAttachment, ZohoTask, ZohoFundedRecord,
  ZohoActivityLog, ZohoVoiceCall,
} from "@/types";
import { getAppUserProfile } from "@/lib/auth-storage";
import { SetLastViewed } from "@/components/set-last-viewed";
import { ZOHO_TO_STAGE } from "@/lib/zoho-map";
import { NEXT_ACTION_TYPES, LOST_REASONS } from "@/lib/constants";
import { DateQuickPick } from "@/components/ui/date-quick-pick";
import { AlertTriangle } from "lucide-react";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function getCurrentUserRef(): { id: string; name: string } | null {
  const u = getAppUserProfile();
  if (u?.id && u.full_name) return { id: u.id, name: u.full_name };
  return null;
}

// ─── Shared API helper ────────────────────────────────────────────────────────

async function makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const doFetch = () =>
    fetch(url, { ...options, credentials: "same-origin" });

  let res = await doFetch();
  if (res.status === 401) {
    const ok = (await fetch("/api/auth/zoho/refresh", { method: "POST", credentials: "same-origin" })).ok;
    if (!ok) throw new Error("Session expired. Please log in again.");
    res = await doFetch();
  }
  return res;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFieldValue(value: unknown, type: string): string | null {
  if (value === null || value === undefined || value === "" || value === "-None-") return null;
  switch (type) {
    case "currency":     return typeof value === "number" ? formatCurrency(value) : null;
    case "integer_days": return typeof value === "number" ? `${value}d` : null;
    case "date":
    case "datetime":     return formatDate(value as string);
    case "owner":
    case "lookup":       return (value as { name: string }).name ?? null;
    case "boolean":      return (value as boolean) ? "Yes" : "No";
    default:             return String(value);
  }
}

function formatAuditedTime(iso: string): string {
  const d = new Date(iso);
  const timePart = d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
  return `${formatDate(iso)} ${formatTime(timePart)}`;
}

// ─── Lost-reason picklist hook ────────────────────────────────────────────────

type LostReasonOption = { display_value: string; actual_value: string };

/**
 * Loads the live `Lost_Dead_Reason` picklist from /api/prospects/lost-reasons.
 * Falls back to the hardcoded `LOST_REASONS` constant on fetch failure so the
 * UI stays usable when the route or Zoho is down.
 */
function useLostReasons(enabled: boolean): {
  options: LostReasonOption[];
  loading: boolean;
  fellBack: boolean;
} {
  const [options,  setOptions]  = useState<LostReasonOption[]>(
    () => LOST_REASONS.map(r => ({ display_value: r.label, actual_value: r.label }))
  );
  const [loading,  setLoading]  = useState(false);
  const [fellBack, setFellBack] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let abort = false;
    setLoading(true);
    (async () => {
      try {
        const res = await makeRequest("/api/prospects/lost-reasons");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as { data?: LostReasonOption[] };
        const data = (json.data ?? []).filter(o => o.actual_value);
        if (abort) return;
        if (data.length === 0) {
          setOptions(LOST_REASONS.map(r => ({ display_value: r.label, actual_value: r.label })));
          setFellBack(true);
        } else {
          setOptions(data);
          setFellBack(false);
        }
      } catch {
        if (abort) return;
        setOptions(LOST_REASONS.map(r => ({ display_value: r.label, actual_value: r.label })));
        setFellBack(true);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [enabled]);

  return { options, loading, fellBack };
}

// ─── Inline Edit Components ───────────────────────────────────────────────────

interface InlineSaveProps {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  error: string | null;
}

function InlineSaveBar({ saving, onSave, onCancel, error }: InlineSaveProps) {
  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex items-center gap-1.5">
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-full bg-healthy-green px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-healthy-green/85 active:scale-95 disabled:opacity-50 transition-all"
        >
          {saving
            ? <Loader2 size={11} className="animate-spin" />
            : <Check size={11} strokeWidth={2.5} />}
          Save
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:border-alert-red/50 hover:text-alert-red active:scale-95 disabled:opacity-50 transition-all"
        >
          <X size={11} strokeWidth={2} />
          Cancel
        </button>
      </span>
      {error && (
        <span className="text-[10px] font-medium text-alert-red flex items-center gap-1">
          <X size={9} className="shrink-0" />{error}
        </span>
      )}
    </span>
  );
}

function InlineTextField({
  value, label = "value", onSave, inputType = "text", className = "", large = false,
}: {
  value: string | null | undefined;
  label?: string;
  onSave: (val: string | null) => Promise<void>;
  inputType?: "text" | "email" | "tel";
  className?: string;
  large?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const start = () => { setDraft(value ?? ""); setErr(null); setEditing(true); };
  const cancel = () => { setEditing(false); setErr(null); };
  const save = async () => {
    if (saving) return;
    setSaving(true); setErr(null);
    try { await onSave(draft.trim() || null); setEditing(false); }
    catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (!editing) {
    return (
      <span
        className={`group/f cursor-pointer inline-flex items-center gap-1.5 rounded px-0.5 -mx-0.5 hover:bg-gold/8 transition-colors ${className}`}
        onClick={start}
      >
        {value
          ? <span className={large ? "text-lg md:text-xl font-semibold text-navy" : ""}>{value}</span>
          : <span className="text-muted-foreground/40 italic text-xs">Add {label}</span>}
        <Pencil size={10} className="opacity-0 group-hover/f:opacity-30 transition-opacity shrink-0" />
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <input
        type={inputType}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
        autoFocus
        className={`border border-gold/50 rounded-md px-2.5 py-1.5 text-navy bg-white focus:outline-none focus:ring-2 focus:ring-gold/40 shadow-sm ${
          large ? "text-lg font-semibold w-56 md:w-72" : "text-sm w-44 md:w-56"
        }`}
      />
      <InlineSaveBar saving={saving} onSave={save} onCancel={cancel} error={err} />
    </span>
  );
}

function InlineCurrencyField({
  value, label = "amount", onSave,
}: {
  value: number | null | undefined;
  label?: string;
  onSave: (val: number | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value != null ? String(value) : "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const start = () => { setDraft(value != null ? String(value) : ""); setErr(null); setEditing(true); };
  const cancel = () => { setEditing(false); setErr(null); };
  const save = async () => {
    if (saving) return;
    const raw = draft.trim().replace(/[$,\s]/g, "");
    const parsed = raw ? parseFloat(raw) : null;
    if (raw && (parsed === null || isNaN(parsed))) { setErr("Enter a valid number"); return; }
    setSaving(true); setErr(null);
    try { await onSave(parsed); setEditing(false); }
    catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (!editing) {
    return (
      <span
        className="group/cf cursor-pointer inline-flex items-center gap-1 hover:bg-gold/8 rounded px-0.5 -mx-0.5 transition-colors"
        onClick={start}
      >
        {value != null
          ? <span className="text-sm font-semibold text-navy tabular-nums">{formatCurrency(value)}</span>
          : <span className="text-xs text-muted-foreground/40 italic">Not set</span>}
        <Pencil size={9} className="opacity-0 group-hover/cf:opacity-30 transition-opacity shrink-0" />
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 border border-gold/50 rounded-md px-2.5 py-1.5 bg-white shadow-sm focus-within:ring-2 focus-within:ring-gold/40">
        <span className="text-sm text-muted-foreground font-medium">$</span>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          autoFocus
          placeholder={label}
          className="text-sm font-semibold text-navy bg-transparent focus:outline-none w-28"
        />
      </span>
      <InlineSaveBar saving={saving} onSave={save} onCancel={cancel} error={err} />
    </span>
  );
}

function InlineDateField({
  value, label = "date", onSave,
}: {
  value: string | null | undefined;
  label?: string;
  onSave: (val: string | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const start = () => { setDraft(value ?? ""); setErr(null); setEditing(true); };
  const cancel = () => { setEditing(false); setErr(null); };
  const save = async () => {
    if (saving) return;
    setSaving(true); setErr(null);
    try { await onSave(draft || null); setEditing(false); }
    catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (!editing) {
    return (
      <span
        className="group/df cursor-pointer inline-flex items-center gap-1 hover:bg-gold/8 rounded px-0.5 -mx-0.5 transition-colors"
        onClick={start}
      >
        {value
          ? <span className="text-sm font-medium text-navy">{formatRelativeDate(value)} · {value}</span>
          : <span className="text-xs text-muted-foreground/40 italic">Add {label}</span>}
        <Pencil size={9} className="opacity-0 group-hover/df:opacity-30 transition-opacity shrink-0" />
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Escape") cancel(); }}
        autoFocus
        className="border border-gold/50 rounded-md px-2.5 py-1.5 text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-gold/40 shadow-sm"
      />
      <InlineSaveBar saving={saving} onSave={save} onCancel={cancel} error={err} />
    </span>
  );
}

function InlineLeadSourceField({
  value, onSave,
}: {
  value: string | null | undefined;
  onSave: (val: string | null) => Promise<void>;
}) {
  const LEAD_SOURCE_OPTIONS = [
    "Velocis Network", "CPA Referral", "Legacy Event", "LinkedIn",
    "Ken - DBJ List", "Ken - Event Follow-up", "Tolleson WM",
    "M&A Attorney", "Cold Outreach", "Other",
  ];

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const start = () => { setDraft(value ?? ""); setErr(null); setEditing(true); };
  const cancel = () => { setEditing(false); setErr(null); };
  const save = async () => {
    if (saving) return;
    setSaving(true); setErr(null);
    try { await onSave(draft || null); setEditing(false); }
    catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (!editing) {
    return (
      <span
        className="group/ls cursor-pointer inline-flex items-center gap-1 hover:bg-gold/8 rounded px-0.5 -mx-0.5 transition-colors"
        onClick={start}
      >
        {value
          ? <span className="text-xs font-medium text-navy">{value}</span>
          : <span className="text-xs text-muted-foreground/40 italic">Not set</span>}
        <Pencil size={9} className="opacity-0 group-hover/ls:opacity-30 transition-opacity shrink-0" />
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <select
        value={draft}
        onChange={e => setDraft(e.target.value)}
        autoFocus
        className="border border-gold/50 rounded-md px-2.5 py-1.5 text-xs text-navy bg-white focus:outline-none focus:ring-2 focus:ring-gold/40 shadow-sm"
      >
        <option value="">— Select —</option>
        {LEAD_SOURCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <InlineSaveBar saving={saving} onSave={save} onCancel={cancel} error={err} />
    </span>
  );
}

function InlineLostReasonField({
  value, onSave,
}: {
  value: string | null | undefined;
  onSave: (val: string | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { options, loading, fellBack } = useLostReasons(editing);

  const start = () => { setDraft(value ?? ""); setErr(null); setEditing(true); };
  const cancel = () => { setEditing(false); setErr(null); };
  const save = async () => {
    if (saving) return;
    setSaving(true); setErr(null);
    try { await onSave(draft || null); setEditing(false); }
    catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (!editing) {
    return (
      <span
        className="group/lr cursor-pointer inline-flex items-center gap-1 hover:bg-gold/8 rounded px-0.5 -mx-0.5 transition-colors"
        onClick={start}
      >
        {value
          ? <span className="text-xs font-medium text-navy">{value}</span>
          : <span className="text-xs text-muted-foreground/40 italic">Not set</span>}
        <Pencil size={9} className="opacity-0 group-hover/lr:opacity-30 transition-opacity shrink-0" />
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <select
        value={draft}
        onChange={e => setDraft(e.target.value)}
        autoFocus
        disabled={loading}
        className="border border-gold/50 rounded-md px-2.5 py-1.5 text-xs text-navy bg-white focus:outline-none focus:ring-2 focus:ring-gold/40 shadow-sm disabled:opacity-50"
      >
        <option value="">— Select —</option>
        {options.map(o => (
          <option key={o.actual_value} value={o.actual_value}>{o.display_value}</option>
        ))}
      </select>
      {fellBack && (
        <span className="text-[10px] text-muted-foreground/70 italic">(offline)</span>
      )}
      <InlineSaveBar saving={saving} onSave={save} onCancel={cancel} error={err} />
    </span>
  );
}

// ─── Prospect Lookup Field (Referrer / Related Contact) ───────────────────────

type ProspectLookupValue = { id: string; name: string } | null;

type ProspectSearchResult = { id: string; Name: string; Pipeline_Stage: string | null };

function InlineProspectLookupField({
  value, excludeId, onSave,
}: {
  value: ProspectLookupValue;
  /** Prospect id to hide from the results list (usually the current prospect). */
  excludeId: string;
  onSave: (val: { id: string; name: string } | null) => Promise<void>;
}) {
  const [editing,   setEditing]   = useState(false);
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<ProspectSearchResult[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState<string | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);

  // Debounced search against /api/prospects. Empty query returns the latest
  // prospects; any term >=2 chars forwards to Zoho's word search.
  useEffect(() => {
    if (!editing) return;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ page: "1", page_size: "20" });
        const trimmed = query.trim();
        if (trimmed.length >= 2) qs.set("search", trimmed);
        const res = await fetch(`/api/prospects?${qs}`, {
          credentials: "same-origin", signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as { data?: ProspectSearchResult[] };
        setResults((json.data ?? []).filter(r => r.id !== excludeId));
      } catch (e) {
        if ((e as { name?: string }).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [editing, query, excludeId]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!editing) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setEditing(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setEditing(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [editing]);

  const commit = async (next: { id: string; name: string } | null) => {
    if (saving) return;
    setSaving(true); setErr(null);
    try { await onSave(next); setEditing(false); setQuery(""); }
    catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (!editing) {
    // Name link and edit icon are separate click targets so navigation
    // vs. edit never conflict. The `from=prospect:{id}` query param lets the
    // target prospect's back-link return to this prospect.
    return (
      <span className="inline-flex items-center gap-2 min-w-0">
        {value
          ? (
            <Link
              href={`/prospect/${value.id}?from=prospect:${excludeId}`}
              className="text-xs font-medium text-navy hover:text-gold hover:underline transition-colors truncate"
            >
              {value.name}
            </Link>
          )
          : (
            <span
              onClick={() => setEditing(true)}
              className="text-xs text-muted-foreground/40 italic cursor-pointer hover:text-muted-foreground"
            >
              Not set
            </span>
          )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Edit"
          className="shrink-0 p-0.5 rounded text-muted-foreground/60 hover:text-gold hover:bg-gold/10 transition-colors"
        >
          <Pencil size={11} />
        </button>
      </span>
    );
  }

  return (
    <span ref={wrapRef} className="relative inline-block w-full max-w-xs">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search prospects…"
        autoFocus
        className="w-full border border-gold/50 rounded-md px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gold/40 shadow-sm"
      />
      <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-64 overflow-y-auto rounded-md border bg-white shadow-lg">
        {value && (
          <button
            onClick={() => commit(null)}
            disabled={saving}
            className="w-full text-left px-2 py-1.5 text-[11px] text-alert-red hover:bg-alert-red/10 border-b disabled:opacity-50"
          >
            Clear current ({value.name})
          </button>
        )}
        {loading && (
          <div className="flex items-center gap-2 px-2 py-2 text-[11px] text-muted-foreground">
            <Loader2 size={11} className="animate-spin" /> Searching…
          </div>
        )}
        {!loading && results.length === 0 && (
          <p className="px-2 py-2 text-[11px] text-muted-foreground">No prospects found.</p>
        )}
        {!loading && results.map((r) => (
          <button
            key={r.id}
            onClick={() => commit({ id: r.id, name: r.Name })}
            disabled={saving}
            className="w-full text-left px-2 py-1.5 text-xs hover:bg-gold/10 border-b last:border-0 disabled:opacity-50"
          >
            <span className="font-medium text-navy">{r.Name}</span>
            {r.Pipeline_Stage && (
              <span className="ml-2 text-[10px] text-muted-foreground">{r.Pipeline_Stage}</span>
            )}
          </button>
        ))}
        {err && (
          <p className="px-2 py-1.5 text-[11px] text-alert-red">{err}</p>
        )}
      </div>
    </span>
  );
}

// ─── Unified Activity ─────────────────────────────────────────────────────────

type ActivityKind = "call" | "email" | "meeting" | "note" | "update" | "stage_change" | "automation" | "commitment" | "activity_log_touch";

interface UnifiedActivity {
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

function buildUnifiedTimeline(
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

const KIND_COLOR: Record<ActivityKind, string> = {
  call: "#2563eb", email: "#7c3aed", meeting: "#0891b2", note: "#6b7280",
  update: "#1e3a5f", stage_change: "#f59e0b", automation: "#9ca3af",
  commitment: "#d97706", activity_log_touch: "#059669",
};
const KIND_LABEL: Record<ActivityKind, string> = {
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

function formatTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
  });
}

function formatDateTime(iso: string): string {
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
function toCtDateKey(d: Date): string {
  // en-CA locale yields "YYYY-MM-DD" which is stable for keying.
  return d.toLocaleDateString("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// ─── 1. Stage Bar (interactive — click to change stage) ──────────────────────

interface StageChangePayload {
  newStage: string;
  nextAction?: string;
  nextActionDate?: string;
  reason?: string;
}

function ProspectStageBar({
  stage,
  onStageChange,
}: {
  stage: string | null;
  onStageChange?: (payload: StageChangePayload) => Promise<void>;
}) {
  const [expanded,       setExpanded]       = useState(false);
  const [pending,        setPending]        = useState<string | null>(null);
  const [nextAction,     setNextAction]     = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [reason,         setReason]         = useState("");
  const [changing,       setChanging]       = useState(false);
  const [changeErr,      setChangeErr]      = useState<string | null>(null);

  const isSpecial = isSpecialProspectStage(stage);
  const currentIdx = getProspectStageIndex(stage);
  const specialMeta = isSpecial
    ? stage === "Dead / Lost" ? { label: "Dead / Lost", color: "text-alert-red" }
    : { label: "Nurture", color: "text-gold" }
    : null;

  const pendingIsSpecial = pending && PROSPECT_SPECIAL_STAGES.some(s => s.value === pending);
  const pendingIsDead = pending === "Dead / Lost";
  const lostReasons = useLostReasons(pendingIsDead);

  const resetForm = () => {
    setPending(null); setNextAction(""); setNextActionDate(""); setReason(""); setChangeErr(null);
  };

  const confirm = async () => {
    if (!pending || !onStageChange || changing) return;
    setChanging(true); setChangeErr(null);
    try {
      await onStageChange({
        newStage: pending,
        nextAction:     nextAction.trim()     || undefined,
        nextActionDate: nextActionDate.trim() || undefined,
        reason:         reason.trim()         || undefined,
      });
      resetForm(); setExpanded(false);
    } catch (e) {
      setChangeErr(e instanceof Error ? e.message : "Stage change failed");
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="cursor-pointer group" onClick={() => !pending && setExpanded(!expanded)}>
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
                      : isPast ? "h-2.5 w-2.5 bg-navy"
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
          {expanded ? "collapse" : onStageChange ? "click stage to change" : "view stages"}
        </p>
      </div>

      {expanded && (
        <div className="mt-3 rounded-lg border bg-card p-3 space-y-1.5">
          {PROSPECT_PROGRESSION_STAGES.map((s, idx) => {
            const isActive = s.value === stage;
            const isPast = !isSpecial && idx < currentIdx;
            const isPending = pending === s.value;
            const canClick = !!onStageChange && s.value !== stage;

            return (
              <button
                key={s.value}
                disabled={!canClick || changing}
                onClick={() => canClick && setPending(isPending ? null : s.value)}
                className={`w-full flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                  isPending ? "bg-gold/20 border border-gold/40"
                  : isActive ? "bg-gold text-navy"
                  : isPast ? "bg-navy/5 text-navy hover:bg-navy/10"
                  : canClick ? "text-muted-foreground hover:bg-muted/50"
                  : "text-muted-foreground opacity-60 cursor-default"
                }`}
              >
                <span className={`text-[10px] tabular-nums w-4 text-center shrink-0 ${isActive ? "font-bold" : "font-medium opacity-50"}`}>
                  {idx + 1}
                </span>
                <span className="text-xs font-medium">{s.label}</span>
                {isPast && !isPending && <span className="ml-auto text-[10px] text-navy/40">✓</span>}
                {isPending && <span className="ml-auto text-[10px] text-gold font-semibold">selected →</span>}
              </button>
            );
          })}

          {/* Special stages */}
          <div className="flex gap-1.5 pt-1.5 mt-1.5 border-t">
            {PROSPECT_SPECIAL_STAGES.map(s => {
              const isActive = s.value === stage;
              const isPending = pending === s.value;
              const canClick = !!onStageChange && s.value !== stage;
              return (
                <button
                  key={s.value}
                  disabled={!canClick || changing}
                  onClick={() => canClick && setPending(isPending ? null : s.value)}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    isPending ? "bg-gold/20 border border-gold/40 text-navy"
                    : isActive && s.value === "Dead / Lost" ? "bg-alert-red text-white"
                    : isActive ? "bg-gold text-navy"
                    : canClick ? "bg-muted text-muted-foreground hover:bg-muted/80"
                    : "bg-muted text-muted-foreground opacity-60 cursor-default"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Pending confirmation */}
          {pending && (
            <div className="mt-2 rounded-lg border border-gold/30 bg-gold/5 p-3 space-y-2.5">
              <p className="text-xs font-semibold text-navy">
                Move to <span className="text-gold">{pending}</span>
              </p>

              {/* Next Action — hidden when moving to Funded or Dead / Lost */}
              {pending !== "Funded" && !pendingIsDead && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Next Action
                    </label>
                    <input
                      value={nextAction}
                      onChange={e => setNextAction(e.target.value)}
                      placeholder="What's the next step? (optional)"
                      className="w-full border border-border rounded px-2 py-1.5 text-xs text-navy bg-white focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Next Action Date
                    </label>
                    <input
                      type="date"
                      value={nextActionDate}
                      onChange={e => setNextActionDate(e.target.value)}
                      className="w-full border border-border rounded px-2 py-1.5 text-xs text-navy bg-white focus:outline-none focus:border-gold"
                    />
                  </div>
                </>
              )}

              {/* Reason — only for special stages */}
              {pendingIsSpecial && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    Reason
                  </label>
                  {pendingIsDead ? (
                    <select
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      className="w-full border border-border rounded px-2 py-1.5 text-xs text-navy bg-white focus:outline-none focus:border-gold"
                    >
                      <option value="">— Select reason —</option>
                      {lostReasons.options.map(o => (
                        <option key={o.actual_value} value={o.actual_value}>{o.display_value}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Why this stage? (optional)"
                      className="w-full border border-border rounded px-2 py-1.5 text-xs text-navy bg-white focus:outline-none focus:border-gold"
                    />
                  )}
                </div>
              )}

              {changeErr && <p className="text-[10px] text-alert-red">{changeErr}</p>}

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={confirm}
                  disabled={changing}
                  className="rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-navy hover:bg-gold-hover disabled:opacity-50 transition-colors"
                >
                  {changing ? <Loader2 size={11} className="animate-spin inline" /> : "Confirm"}
                </button>
                <button
                  onClick={resetForm}
                  className="text-xs text-muted-foreground hover:text-navy transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 2. Identity Bar ──────────────────────────────────────────────────────────

function ProspectIdentityBar({
  prospect, onUpdate,
}: {
  prospect: ZohoProspectDetail;
  onUpdate: (fields: Record<string, unknown>) => Promise<void>;
}) {
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = prospect.Next_Action_Date != null && prospect.Next_Action_Date < today;
  const isStale = (prospect.Days_Since_Last_Touch ?? 0) > 14;

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        <InlineTextField
          value={prospect.Name}
          label="name"
          large
          onSave={val => val ? onUpdate({ Name: val }) : Promise.reject(new Error("Name is required"))}
        />
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

      <div className="mt-0.5">
        <InlineTextField
          value={prospect.Company_Entity}
          label="company / entity"
          className="text-sm text-muted-foreground"
          onSave={val => onUpdate({ Company_Entity: val })}
        />
      </div>

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-navy/8 px-3 py-1.5 text-xs font-medium text-navy">
          <InlineTextField
            value={prospect.Phone}
            label="phone"
            inputType="tel"
            onSave={val => onUpdate({ Phone: val })}
          />
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-navy/8 px-3 py-1.5 text-xs font-medium text-navy">
          {prospect.Email ? (
            <a
              href={`mailto:${prospect.Email}`}
              aria-label={`Email ${prospect.Email}`}
              className="text-navy hover:text-gold transition-colors shrink-0"
              onClick={e => e.stopPropagation()}
            >
              <Mail size={12} />
            </a>
          ) : (
            <Mail size={12} />
          )}
          <InlineTextField
            value={prospect.Email}
            label="email"
            inputType="email"
            onSave={val => onUpdate({ Email: val })}
          />
        </span>
      </div>
    </div>
  );
}

// ─── 3. Next Action Bar ───────────────────────────────────────────────────────

type NextActionMode = "view" | "edit" | "drop";
type DropTarget = "dead" | "nurture" | null;

function sixMonthsOutCT(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split("T")[0];
}

function ProspectNextActionBar({
  prospect, onUpdate, onRefresh,
}: {
  prospect: ZohoProspectDetail;
  onUpdate: (fields: Record<string, unknown>) => Promise<void>;
  onRefresh?: () => void | Promise<void>;
}) {
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = prospect.Next_Action_Date != null && prospect.Next_Action_Date < today;
  const isStale = (prospect.Days_Since_Last_Touch ?? 0) > 14;
  const isUrgent = isOverdue || isStale;
  const hasAction = !!prospect.Next_Action;

  const [mode,       setMode]       = useState<NextActionMode>("view");
  const [openCommitId, setOpenCommitId] = useState<string | null>(null);
  const [commitLoaded, setCommitLoaded] = useState(false);

  // Lazy-load Zoho Lost_Dead_Reason picklist when the drop form opens.
  const lostReasons = useLostReasons(mode === "drop");

  // Edit / Reschedule form
  const [actionType, setActionType] = useState("Follow-up");
  const [detail,     setDetail]     = useState("");
  const [date,       setDate]       = useState("");

  // Drop form
  const [dropTarget,   setDropTarget]   = useState<DropTarget>(null);
  const [lostReason,   setLostReason]   = useState<string | null>(null);
  const [reengageDate, setReengageDate] = useState<string>(() => sixMonthsOutCT());
  const [reasonNote,   setReasonNote]   = useState("");

  const [busy,  setBusy]  = useState<null | "done" | "edit" | "drop">(null);
  const [error, setError] = useState<string | null>(null);

  // Outstanding panel staged selection — user picks D/P/R, then Confirm applies.
  type ResolutionChoice = "done" | "pending" | "replace";
  const [selectedAction, setSelectedAction] = useState<ResolutionChoice | null>(null);

  // Fetch the current open commitment id so Mark Done / Cancel can target it.
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const res = await makeRequest(`/api/prospects/${prospect.id}/commitments`);
        if (!res.ok) { if (!abort) setCommitLoaded(true); return; }
        const { data } = await res.json() as { data?: Array<{ id: string }> };
        if (abort) return;
        setOpenCommitId(data?.[0]?.id ?? null);
      } catch {
        /* non-fatal */
      } finally {
        if (!abort) setCommitLoaded(true);
      }
    })();
    return () => { abort = true; };
  }, [prospect.id, prospect.Next_Action, prospect.Next_Action_Date]);

  function startEdit() {
    setActionType("Follow-up");
    setDetail("");
    setDate(prospect.Next_Action_Date ?? "");
    setError(null);
    setMode("edit");
  }

  function startDrop() {
    setDropTarget(null);
    setLostReason(null);
    setReengageDate(sixMonthsOutCT());
    setReasonNote("");
    setError(null);
    setMode("drop");
  }

  async function supersedeOpenCommitments(): Promise<void> {
    const openRes = await makeRequest(`/api/prospects/${prospect.id}/commitments`);
    if (!openRes.ok) return;
    const { data } = await openRes.json() as { data: Array<{ id: string }> };
    await Promise.all(
      (data ?? []).map(c =>
        makeRequest(`/api/prospects/${prospect.id}/commitments/${c.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ status: "superseded" }),
        })
      )
    );
  }

  async function handleSaveReschedule() {
    const effectiveDetail = detail.trim() || prospect.Next_Action || "";
    if (!effectiveDetail || !date) { setError("Detail and date are required."); return; }
    setBusy("edit");
    setError(null);
    try {
      await supersedeOpenCommitments();
      const createRes = await makeRequest(`/api/prospects/${prospect.id}/commitments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: actionType, detail: effectiveDetail, dueDate: date }),
      });
      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to save next action.");
      }
      await onUpdate({ Next_Action: effectiveDetail, Next_Action_Date: date });
      setOpenCommitId(null);
      setMode("view");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setBusy(null);
    }
  }

  async function handleMarkDone() {
    if (busy) return;
    setBusy("done");
    setError(null);
    try {
      if (openCommitId) {
        const res = await makeRequest(
          `/api/prospects/${prospect.id}/commitments/${openCommitId}`,
          {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ status: "fulfilled" }),
          },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? "Failed to mark done.");
        }
      }
      await onUpdate({ Next_Action: null, Next_Action_Date: null });
      setOpenCommitId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mark done.");
    } finally {
      setBusy(null);
    }
  }

  // "Still pending" is a true no-op (honest-red invariant): leave the open
  // commitment alone. Visual acknowledgement only.
  const [pendingAck, setPendingAck] = useState(false);
  function handleMarkPending() {
    if (busy) return;
    setPendingAck(true);
    setTimeout(() => setPendingAck(false), 1500);
  }

  async function handleDropConfirm() {
    if (busy) return;
    if (dropTarget === "dead" && !lostReason) {
      setError("Pick a reason first.");
      return;
    }
    if (dropTarget === "nurture" && !reengageDate) {
      setError("Pick a re-engage date.");
      return;
    }
    if (!dropTarget) return;
    setBusy("drop");
    setError(null);
    try {
      // 1. Cancel open commitments.
      await Promise.all(
        (openCommitId ? [openCommitId] : []).map(cid =>
          makeRequest(`/api/prospects/${prospect.id}/commitments/${cid}`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ status: "cancelled" }),
          }),
        ),
      );

      // 2. Log stage-change touch.
      const reasonValue = lostReason ?? "";
      const reasonLabel =
        lostReasons.options.find(o => o.actual_value === reasonValue)?.display_value ?? reasonValue;
      const stageNoteText = dropTarget === "dead"
        ? `Stage changed to Dead/Lost. Reason: ${reasonLabel}.`
        : `Stage changed to Nurture. Re-engage: ${reengageDate}.`;
      await makeRequest(`/api/prospects/${prospect.id}/activities`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: "stage_change", description: stageNoteText }),
      });

      // 2a. Persist user-typed reason note as separate Note record.
      const trimmedReasonNote = reasonNote.trim();
      if (dropTarget === "dead" && trimmedReasonNote) {
        await makeRequest(`/api/prospects/${prospect.id}/notes`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ content: trimmedReasonNote }),
        });
      }

      // 3. Update prospect stage + fields.
      const fields: Record<string, unknown> = {
        Pipeline_Stage:    dropTarget === "dead" ? "Dead / Lost" : "Nurture",
        Next_Action:       null,
        Next_Action_Date:  dropTarget === "nurture" ? reengageDate : null,
      };
      if (dropTarget === "dead") fields.Lost_Dead_Reason = reasonValue;
      await onUpdate(fields);
      setOpenCommitId(null);
      setMode("view");
      await onRefresh?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to end lead.");
    } finally {
      setBusy(null);
    }
  }

  // ── Edit / Reschedule form ────────────────────────────────────────────────
  if (mode === "edit") {
    return (
      <div className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-3 space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gold">
          {hasAction ? "Reschedule / Replace Next Action" : "Set Next Action"}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={actionType}
            onChange={e => setActionType(e.target.value)}
            className="rounded-md border bg-card px-2 py-1.5 text-xs"
          >
            {NEXT_ACTION_TYPES.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <input
            value={detail}
            onChange={e => setDetail(e.target.value)}
            placeholder={prospect.Next_Action || "What needs to happen?"}
            className="flex-1 min-w-[200px] rounded-md border bg-card px-2.5 py-1.5 text-xs focus:outline-none focus:border-gold"
            onKeyDown={e => { if (e.key === "Enter") handleSaveReschedule(); if (e.key === "Escape") setMode("view"); }}
            autoFocus
          />
        </div>
        <DateQuickPick value={date} onChange={setDate} />
        {error && <p className="text-xs text-alert-red">{error}</p>}
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => { setMode("view"); setError(null); }} className="text-xs text-muted-foreground hover:text-navy">
            Cancel
          </button>
          <button
            onClick={handleSaveReschedule}
            disabled={busy === "edit"}
            className="rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-navy hover:bg-gold-hover disabled:opacity-50"
          >
            {busy === "edit" ? "Saving..." : hasAction ? "Save & Replace" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  // ── End / Drop Lead form (DropLeadPanel-style) ────────────────────────────
  if (mode === "drop") {
    return (
      <div
        role="group"
        aria-label={`Drop lead: ${prospect.Name}`}
        className="rounded-lg border border-muted-foreground/20 bg-muted/40 p-4 space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-navy">Drop lead</p>
            <p className="text-xs text-muted-foreground">
              Move {prospect.Name} out of active pipeline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setMode("view"); setError(null); }}
            className="text-xs text-muted-foreground hover:text-navy"
          >
            Cancel
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={dropTarget === "dead"}
            onClick={() => { setDropTarget("dead"); setError(null); }}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              dropTarget === "dead" ? "bg-gold text-navy" : "bg-card text-navy hover:bg-gold/20"
            }`}
          >
            <span className="font-semibold">[D]</span> Dead
          </button>
          <button
            type="button"
            aria-pressed={dropTarget === "nurture"}
            onClick={() => { setDropTarget("nurture"); setError(null); }}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              dropTarget === "nurture" ? "bg-gold text-navy" : "bg-card text-navy hover:bg-gold/20"
            }`}
          >
            <span className="font-semibold">[N]</span> Nurture
          </button>
        </div>

        {dropTarget === "dead" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {lostReasons.loading && lostReasons.options.length === 0 ? (
                <Loader2 size={12} className="animate-spin text-muted-foreground" />
              ) : (
                lostReasons.options.map((r) => {
                  const active = lostReason === r.actual_value;
                  return (
                    <button
                      key={r.actual_value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setLostReason(r.actual_value)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "bg-gold text-navy"
                          : "bg-card text-muted-foreground hover:bg-gold/20 hover:text-navy"
                      }`}
                    >
                      {r.display_value}
                    </button>
                  );
                })
              )}
              {lostReasons.fellBack && (
                <span className="text-[10px] text-muted-foreground/70 italic">(offline reasons)</span>
              )}
            </div>
            <input
              type="text"
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              placeholder="Optional note (what did they say?)"
              className="w-full rounded-md border bg-card px-2.5 py-1.5 text-xs placeholder:text-muted-foreground/50"
            />
          </div>
        )}

        {dropTarget === "nurture" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Re-engage on:</p>
            <DateQuickPick value={reengageDate} onChange={setReengageDate} />
          </div>
        )}

        {error && <p role="alert" className="text-xs font-medium text-alert-red">{error}</p>}

        {dropTarget !== null && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleDropConfirm}
              disabled={
                busy === "drop" ||
                (dropTarget === "dead" && !lostReason) ||
                (dropTarget === "nurture" && !reengageDate)
              }
              className="rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-navy hover:bg-gold-hover disabled:opacity-50"
            >
              {busy === "drop" ? <Loader2 size={11} className="animate-spin inline" /> : "Confirm"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── View ──────────────────────────────────────────────────────────────────
  // Outstanding = commitment past-due or due today (reference §6.4.2).
  // Only the outstanding case shows the CloseOutPrompt-style (Done/Pending/
  // Replace) panel. Every other state keeps the simple "click to edit" bar.
  const dueToday = prospect.Next_Action_Date === today;
  const outstanding = hasAction && (isOverdue || dueToday);

  if (outstanding) {
    const overdueDays = (() => {
      if (!prospect.Next_Action_Date) return 0;
      const due = new Date(prospect.Next_Action_Date + "T00:00:00").getTime();
      const now = new Date(today + "T00:00:00").getTime();
      return Math.max(0, Math.round((now - due) / 86400000));
    })();
    const actionLabel = prospect.Next_Action ?? "Next Action";

    async function handleConfirmResolution() {
      if (!selectedAction || busy) return;
      if (selectedAction === "done") {
        await handleMarkDone();
        setSelectedAction(null);
      } else if (selectedAction === "pending") {
        handleMarkPending();
        setSelectedAction(null);
      } else if (selectedAction === "replace") {
        setSelectedAction(null);
        startEdit();
      }
    }

    const chipMeta: { key: ResolutionChoice; hotkey: "D" | "P" | "R"; title: string; desc: string }[] = [
      { key: "done",    hotkey: "D", title: "Done",          desc: "activity handled it" },
      { key: "pending", hotkey: "P", title: "Still pending", desc: "stays open" },
      { key: "replace", hotkey: "R", title: "Replace",       desc: "set a new one" },
    ];

    return (
      <div
        role="group"
        aria-label="Next action — outstanding"
        className="rounded-lg p-4 space-y-3 border border-alert-red/30 bg-alert-red/5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-alert-red" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wider text-alert-red">
              Outstanding
            </p>
          </div>
          <button
            type="button"
            onClick={startDrop}
            disabled={!!busy}
            className="text-[11px] text-muted-foreground hover:text-navy hover:underline shrink-0"
          >
            Drop lead ▸
          </button>
        </div>

        <p className="text-sm text-navy">
          <span className="font-medium">{actionLabel}</span>
          {prospect.Next_Action_Date && (
            <>
              <span className="text-muted-foreground">
                {" "}— due {formatDate(prospect.Next_Action_Date)}
              </span>
              {overdueDays > 0 && (
                <span className="font-semibold text-alert-red"> ({overdueDays}d overdue)</span>
              )}
            </>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          {chipMeta.map((m) => {
            const active = selectedAction === m.key;
            return (
              <button
                key={m.key}
                type="button"
                aria-pressed={active}
                onClick={() => { setSelectedAction(m.key); setError(null); }}
                disabled={(m.key === "done" && !commitLoaded) || !!busy}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                  active
                    ? "bg-gold text-navy"
                    : "bg-muted text-muted-foreground hover:bg-gold/20 hover:text-navy"
                }`}
              >
                <span className="font-semibold">[{m.hotkey}]</span> {m.title}
                <span className="ml-1 font-normal opacity-70">— {m.desc}</span>
              </button>
            );
          })}
        </div>

        {selectedAction && (
          <div className="flex items-center justify-end gap-2 border-t border-alert-red/10 pt-2">
            <button
              type="button"
              onClick={() => { setSelectedAction(null); setError(null); }}
              disabled={!!busy}
              className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-navy disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmResolution}
              disabled={!!busy}
              className="rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-navy hover:bg-gold-hover disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {busy === "done" && <Loader2 size={11} className="animate-spin" />}
              Confirm
            </button>
          </div>
        )}

        {error && <p role="alert" className="text-xs font-medium text-alert-red">{error}</p>}
      </div>
    );
  }

  // Non-outstanding: previous simple design. Click the bar to edit.
  return (
    <div className="space-y-0">
      {hasAction && isStale && (
        <div className="rounded-t-lg bg-alert-red/8 border border-b-0 border-alert-red/15 px-3 py-1 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-alert-red shrink-0" />
          <span className="text-[11px] font-medium text-alert-red">
            Stale — {prospect.Days_Since_Last_Touch}d idle
          </span>
        </div>
      )}
      <div
        className={`${
          hasAction && isStale
            ? "rounded-b-lg border border-t-0 border-alert-red/15"
            : "rounded-lg border border-gold/15"
        } bg-gold/5 px-3 py-2 cursor-pointer hover:bg-gold/10 transition-colors`}
        onClick={startEdit}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gold">Next Action</p>
            {hasAction ? (
              <p className="text-sm font-semibold text-navy line-clamp-1">{prospect.Next_Action}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not set — click to add</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {!isStale && prospect.Next_Action_Date && (
              <span className="text-xs font-medium text-navy">
                {formatRelativeDate(prospect.Next_Action_Date)}
              </span>
            )}
            <Pencil size={12} className="text-muted-foreground/40" />
          </div>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-alert-red">{error}</p>}
    </div>
  );
}

// ─── 4. Profile Card ──────────────────────────────────────────────────────────

function ProspectProfileCard({
  prospect, onUpdate,
}: {
  prospect: ZohoProspectDetail;
  onUpdate: (fields: Record<string, unknown>) => Promise<void>;
}) {
  const financialFields = PROSPECT_PROFILE_FIELDS.filter(f => f.section === "financials");
  const detailFields = PROSPECT_PROFILE_FIELDS.filter(f => f.section === "details");
  const currentStage = prospect.Pipeline_Stage;

  const EDITABLE_FINANCIALS: Record<string, string> = {
    Initial_Investment_Target: "target",
    Growth_Target: "growth",
    Committed_Amount: "committed",
  };

  return (
    <div className="rounded-lg border bg-card">
      <ProspectStageBar
        stage={currentStage}
        onStageChange={async ({ newStage, nextAction, nextActionDate, reason }) => {
          const fields: Record<string, unknown> = { Pipeline_Stage: newStage };
          if (nextAction)     fields.Next_Action      = nextAction;
          if (nextActionDate) fields.Next_Action_Date = nextActionDate;
          if (reason)         fields.Lost_Dead_Reason = reason;
          await onUpdate(fields);
        }}
      />

      <div className="px-4 pb-4 space-y-3">
        {/* Financials grid */}
        <div className="grid grid-cols-3 gap-4 pt-3 pb-2 border-t">
          {financialFields.map(field => {
            const raw = (prospect as Record<string, unknown>)[field.api_name];
            const apiName = field.api_name;
            if (EDITABLE_FINANCIALS[apiName]) {
              return (
                <div key={apiName}>
                  <p className="text-[10px] text-muted-foreground tracking-wide mb-0.5">{field.label}</p>
                  <InlineCurrencyField
                    value={raw as number | null}
                    label={EDITABLE_FINANCIALS[apiName]}
                    onSave={val => onUpdate({ [apiName]: val })}
                  />
                </div>
              );
            }
            const formatted = formatFieldValue(raw, field.type);
            return (
              <div key={apiName}>
                <p className="text-[10px] text-muted-foreground tracking-wide mb-0.5">{field.label}</p>
                {formatted
                  ? <p className="text-sm font-semibold text-navy tabular-nums">{formatted}</p>
                  : <p className="text-xs text-muted-foreground/40 italic">Not set</p>}
              </div>
            );
          })}
        </div>

        {/* Detail rows — existing fields on the left, Referrer / Related
            Contact on the right, stacked into a two-column grid. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          <div className="space-y-2 min-w-0">
            {detailFields.map(field => {
              if (field.showForStages && currentStage && !field.showForStages.includes(currentStage)) return null;
              const raw = (prospect as Record<string, unknown>)[field.api_name];

              // Lead_Source: inline select
              if (field.api_name === "Lead_Source") {
                return (
                  <div key={field.api_name} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-28 shrink-0 tracking-wide">{field.label}</span>
                    <InlineLeadSourceField
                      value={raw as string | null}
                      onSave={val => onUpdate({ Lead_Source: val })}
                    />
                  </div>
                );
              }

              // Company entity: already editable in identity bar
              if (field.api_name === "Company_Entity") return null;

              // Lost/Dead reason: inline picklist (live from Zoho)
              if (field.api_name === "Lost_Dead_Reason") {
                return (
                  <div key={field.api_name} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-28 shrink-0 tracking-wide">{field.label}</span>
                    <InlineLostReasonField
                      value={raw as string | null}
                      onSave={val => onUpdate({ Lost_Dead_Reason: val })}
                    />
                  </div>
                );
              }

              const formatted = formatFieldValue(raw, field.type);
              if (!formatted) return null;
              return (
                <div key={field.api_name} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-28 shrink-0 tracking-wide">{field.label}</span>
                  <span className="text-xs font-medium text-navy flex-1 truncate">{formatted}</span>
                </div>
              );
            })}
          </div>

          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-28 shrink-0 tracking-wide">Referrer</span>
              <InlineProspectLookupField
                value={prospect.Referrer1}
                excludeId={prospect.id}
                onSave={val => onUpdate({ Referrer1: val })}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-28 shrink-0 tracking-wide">Related Contact</span>
              <InlineProspectLookupField
                value={prospect.Related_Contact}
                excludeId={prospect.id}
                onSave={val => onUpdate({ Related_Contact: val })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 5. Unified Activity Timeline (read-only) ─────────────────────────────────

const FILTER_OPTIONS = [
  { key: "all", label: "All" }, { key: "call", label: "Calls" },
  { key: "email", label: "Emails" }, { key: "meeting", label: "Meetings" },
  { key: "commitment", label: "Commitments" },
  { key: "stage_change", label: "Stage Changes" }, { key: "update", label: "Updates" },
  { key: "automation", label: "Automated" },
];

const KIND_ICON: Record<ActivityKind, React.ReactNode> = {
  call: <Phone size={12} />, email: <Mail size={12} />, meeting: <CalendarDays size={12} />,
  note: <FileText size={12} />, update: <Pencil size={12} />, stage_change: <ArrowRight size={12} />,
  automation: <Zap size={12} />, commitment: <CheckSquare size={12} />, activity_log_touch: <MessageSquare size={12} />,
};

function ActivityIcon({ kind }: { kind: ActivityKind }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ring-2 ring-background"
      style={{ backgroundColor: KIND_COLOR[kind] }}>
      {KIND_ICON[kind]}
    </div>
  );
}

const UNKNOWN_DATE_KEY = "__unknown__";

function groupByDate(activities: UnifiedActivity[]): { dateLabel: string; items: UnifiedActivity[] }[] {
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

function EntryRow({ activity, isLast, children }: { activity: UnifiedActivity; isLast: boolean; children: React.ReactNode }) {
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

function VoiceCallCardContent({ activity }: { activity: UnifiedActivity }) {
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

function EmailCardContent({ activity }: { activity: UnifiedActivity }) {
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

function MeetingCardContent({ activity }: { activity: UnifiedActivity }) {
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

function NoteCardContent({ activity }: { activity: UnifiedActivity }) {
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

function ActivityLogTouchCardContent({ activity }: { activity: UnifiedActivity }) {
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

function ActivityLogCommitmentCardContent({ activity }: { activity: UnifiedActivity }) {
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

/**
 * Self-fetching Activity Timeline.
 * Data is loaded only when the section is first expanded — never on initial page load.
 */
function ProspectActivityTimeline({ prospectId }: { prospectId: string }) {
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

// ─── 6. Notes Section with full CRUD ─────────────────────────────────────────

function ProspectNotesSection({
  notes, onAdd, onEdit, onDelete,
}: {
  notes: ZohoNote[];
  onAdd: (title: string, content: string) => Promise<void>;
  onEdit: (noteId: string, title: string, content: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [addingNote, setAddingNote] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addContent, setAddContent] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!addContent.trim() || addSubmitting) return;
    setAddSubmitting(true); setAddError(null);
    try {
      await onAdd(addTitle, addContent);
      setAddTitle(""); setAddContent(""); setAddingNote(false);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add note");
    } finally {
      setAddSubmitting(false);
    }
  };

  const startEdit = (note: ZohoNote) => {
    setEditingId(note.id);
    setEditTitle(note.Note_Title ?? "");
    setEditContent(note.Note_Content ?? "");
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
    setEditError(null);
  };

  const handleEdit = async () => {
    if (!editingId || !editContent.trim() || editSubmitting) return;
    setEditSubmitting(true); setEditError(null);
    try {
      await onEdit(editingId, editTitle, editContent);
      setEditingId(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to update note");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    try { await onDelete(noteId); }
    catch (e) { alert(e instanceof Error ? e.message : "Failed to delete note"); }
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 flex-1 text-left group">
          {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
          <h3 className="text-sm font-semibold text-navy">Notes</h3>
          <span className="ml-1 text-[10px] text-muted-foreground">{notes.length}</span>
        </button>
        <button
          onClick={() => { setAddingNote(!addingNote); setExpanded(true); }}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-gold hover:text-gold/80 transition-colors"
        >
          <Plus size={11} />
          Add note
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 pl-5">
          {/* Add note form */}
          {addingNote && (
            <div className="rounded-md border border-gold/30 bg-gold/5 p-3 space-y-2">
              <input
                value={addTitle}
                onChange={e => setAddTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full border border-border rounded px-2 py-1.5 text-xs font-medium text-navy bg-white focus:outline-none focus:border-gold"
              />
              <NoteEditor
                value={addContent}
                onChange={setAddContent}
                placeholder="Write a note…"
                minHeight={100}
              />
              {addError && <p className="text-[10px] text-alert-red">{addError}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!addContent.trim() || addSubmitting}
                  className="rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-navy hover:bg-gold-hover disabled:opacity-50 transition-colors"
                >
                  {addSubmitting ? <Loader2 size={11} className="animate-spin inline" /> : "Save Note"}
                </button>
                <button
                  onClick={() => { setAddingNote(false); setAddTitle(""); setAddContent(""); setAddError(null); }}
                  className="text-xs text-muted-foreground hover:text-navy transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {notes.length === 0 && !addingNote && (
            <p className="text-sm text-muted-foreground italic">No notes yet.</p>
          )}

          {notes.map(note => (
            <div key={note.id}>
              {editingId === note.id ? (
                <div className="rounded-md border border-gold/30 bg-gold/5 p-3 space-y-2">
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="w-full border border-border rounded px-2 py-1.5 text-xs font-medium text-navy bg-white focus:outline-none focus:border-gold"
                  />
                  <NoteEditor
                    value={editContent}
                    onChange={setEditContent}
                    placeholder="Note content…"
                    minHeight={100}
                  />
                  {editError && <p className="text-[10px] text-alert-red">{editError}</p>}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleEdit}
                      disabled={!editContent.trim() || editSubmitting}
                      className="rounded-full bg-gold px-4 py-1.5 text-xs font-semibold text-navy hover:bg-gold-hover disabled:opacity-50 transition-colors"
                    >
                      {editSubmitting ? <Loader2 size={11} className="animate-spin inline" /> : "Save Changes"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-xs text-muted-foreground hover:text-navy transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border bg-card px-3 py-2.5 group/note relative">
                  {note.Note_Title && <p className="text-xs font-semibold text-navy mb-1.5">{note.Note_Title}</p>}
                  {note.Note_Content && (
                    <NoteContent html={note.Note_Content} />
                  )}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t">
                    <span className="text-[10px] text-muted-foreground">{note.Created_By?.name ?? "—"}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(note.Created_Time)}</span>
                  </div>
                  {/* Edit / Delete icons */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(note)}
                      className="p-1 rounded text-muted-foreground hover:text-navy hover:bg-muted/60 transition-colors"
                      title="Edit note"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1 rounded text-muted-foreground hover:text-alert-red hover:bg-alert-red/10 transition-colors"
                      title="Delete note"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 7. Record Info ───────────────────────────────────────────────────────────

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
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 w-full text-left group">
        {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
        <TrendingUp size={14} className="text-gold shrink-0" />
        <h3 className="text-sm font-semibold text-navy">Pipeline Stage History</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{history.length} record{history.length !== 1 ? "s" : ""}</span>
      </button>
      {expanded && (
        <div className="mt-3 pl-5">
          {history.length === 0
            ? <p className="text-sm text-muted-foreground italic">No stage history.</p>
            : (
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
                    {history.map(row => (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2"><span className="font-medium text-navy">{row.Pipeline_Stage ?? "—"}</span></td>
                        <td className="px-3 py-2 text-muted-foreground">{row.Duration_Days != null ? `${row.Duration_Days}d` : "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.Modified_Time ? formatDate(row.Modified_Time) : "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.Modified_By?.name ?? "—"}</td>
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
            )
          }
        </div>
      )}
    </div>
  );
}

// ─── 9. Tasks ─────────────────────────────────────────────────────────────────

const TASK_STATUS_OPEN = new Set(["Not Started", "In Progress", "Waiting on input", "Deferred"]);

function taskPriorityColor(priority: string | null) {
  if (priority === "High") return "text-alert-red";
  if (priority === "Normal") return "text-gold";
  return "text-muted-foreground";
}

function ProspectTasksSection({ tasks }: { tasks: ZohoTask[] }) {
  const [expanded, setExpanded] = useState(true);
  const [showClosed, setShowClosed] = useState(false);
  const openTasks = tasks.filter(t => TASK_STATUS_OPEN.has(t.Status ?? ""));
  const closedTasks = tasks.filter(t => !TASK_STATUS_OPEN.has(t.Status ?? ""));
  const visibleTasks = showClosed ? closedTasks : openTasks;

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 w-full text-left group">
        {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
        <CheckSquare size={14} className="text-navy shrink-0" />
        <h3 className="text-sm font-semibold text-navy">Activities</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{openTasks.length} open · {closedTasks.length} closed</span>
      </button>
      {expanded && (
        <div className="mt-3 pl-5 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setShowClosed(false)} className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${!showClosed ? "bg-navy text-white border-navy" : "border-border text-muted-foreground hover:border-navy/40"}`}>Open ({openTasks.length})</button>
            <button onClick={() => setShowClosed(true)} className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${showClosed ? "bg-navy text-white border-navy" : "border-border text-muted-foreground hover:border-navy/40"}`}>Closed ({closedTasks.length})</button>
          </div>
          {visibleTasks.length === 0
            ? <p className="text-sm text-muted-foreground italic">No {showClosed ? "closed" : "open"} activities.</p>
            : <div className="space-y-2">
                {visibleTasks.map(task => (
                  <div key={task.id} className="rounded-md border bg-card px-3 py-2.5 space-y-1">
                    <div className="flex items-start gap-2">
                      {showClosed
                        ? <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                        : <CircleDot size={13} className={`mt-0.5 shrink-0 ${taskPriorityColor(task.Priority)}`} />}
                      <span className="text-xs font-medium text-navy leading-tight">{task.Subject ?? "Untitled Task"}</span>
                      {task.Priority && <span className={`ml-auto text-[10px] font-semibold shrink-0 ${taskPriorityColor(task.Priority)}`}>{task.Priority}</span>}
                    </div>
                    {task.Description && <p className="text-[11px] text-muted-foreground pl-5 leading-relaxed line-clamp-2">{task.Description}</p>}
                    <div className="flex items-center gap-3 pt-1 border-t mt-1.5 pl-5">
                      {task.Due_Date && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock size={10} />{formatDate(task.Due_Date)}</span>}
                      {task.Closed_Time && <span className="flex items-center gap-1 text-[10px] text-emerald-600"><CheckCircle2 size={10} />Closed {formatDate(task.Closed_Time)}</span>}
                      {task.Owner && <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto"><User size={10} />{task.Owner.name}</span>}
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
}

// ─── 10. Attachments with upload + delete ────────────────────────────────────

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
  attachments, prospectId, onUpload, onDelete,
}: {
  attachments: ZohoAttachment[];
  prospectId: string;
  onUpload: (file: File) => Promise<void>;
  onDelete: (attachmentId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDownload = async (att: ZohoAttachment) => {
    setDownloading(att.id);
    const doFetch = () =>
      fetch(`/api/prospects/${prospectId}/attachments/${att.id}`, { credentials: "same-origin" });
    try {
      let res = await doFetch();
      if (res.status === 401) {
        const ok = (await fetch("/api/auth/zoho/refresh", { method: "POST", credentials: "same-origin" })).ok;
        if (!ok) { alert("Session expired. Please log in again."); return; }
        res = await doFetch();
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string; detail?: string };
        alert(`Download failed: ${body.error ?? res.statusText}${body.detail ? `\n${body.detail}` : ""}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = att.File_Name ?? att.id;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[download]", err); alert("Network error while downloading.");
    } finally {
      setDownloading(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setUploadError("File must be under 20 MB"); return; }
    setUploading(true); setUploadError(null);
    try {
      await onUpload(file);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (att: ZohoAttachment) => {
    if (!window.confirm(`Delete "${att.File_Name ?? "this file"}"? This cannot be undone.`)) return;
    try { await onDelete(att.id); }
    catch (e) { alert(e instanceof Error ? e.message : "Failed to delete attachment"); }
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 flex-1 text-left group">
          {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
          <Paperclip size={14} className="text-muted-foreground shrink-0" />
          <h3 className="text-sm font-semibold text-navy">Attachments</h3>
          <span className="ml-1 text-[10px] text-muted-foreground">{attachments.length}</span>
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-gold hover:text-gold/80 disabled:opacity-50 transition-colors"
        >
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      {uploadError && <p className="mt-1 pl-5 text-[10px] text-alert-red">{uploadError}</p>}

      {expanded && (
        <div className="mt-3 pl-5 space-y-2">
          {attachments.length === 0 && !uploading && (
            <p className="text-sm text-muted-foreground italic">No attachments.</p>
          )}
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5 group/att">
              <div className="shrink-0 w-8 h-8 rounded bg-muted flex items-center justify-center">
                <span className="text-[8px] font-bold text-muted-foreground">{fileExtension(att.File_Name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-navy truncate">{att.File_Name ?? "Unnamed file"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatFileSize(att.Size)} · {att.Created_By?.name ?? "—"} · {att.Created_Time ? formatDate(att.Created_Time) : "—"}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleDownload(att)}
                  disabled={downloading === att.id}
                  className="flex items-center gap-1 text-[10px] font-medium text-navy hover:text-gold transition-colors disabled:opacity-50 border border-border rounded px-2 py-1"
                  title="Download"
                >
                  {downloading === att.id ? <Loader2 size={10} className="animate-spin" /> : <Paperclip size={10} />}
                  {downloading === att.id ? "…" : "Download"}
                </button>
                <button
                  onClick={() => handleDelete(att)}
                  className="p-1 rounded text-muted-foreground hover:text-alert-red hover:bg-alert-red/10 transition-colors opacity-0 group-hover/att:opacity-100"
                  title="Delete attachment"
                >
                  <Trash2 size={11} />
                </button>
              </div>
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
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 w-full text-left group">
        {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
        <DollarSign size={14} className="text-emerald-600 shrink-0" />
        <h3 className="text-sm font-semibold text-navy">Funded Investor Records</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{funded.length}</span>
      </button>
      {expanded && (
        <div className="mt-3 pl-5 space-y-2">
          {funded.length === 0
            ? <p className="text-sm text-muted-foreground italic">No funded investor records.</p>
            : funded.map(rec => (
              <div key={rec.id} className="rounded-md border bg-card px-3 py-2.5 space-y-0.5">
                <p className="text-xs font-semibold text-navy">{rec.Name ?? "—"}</p>
                {rec.Email && <p className="text-[11px] text-muted-foreground">{rec.Email}</p>}
                {rec.Owner && <p className="text-[10px] text-muted-foreground">Owner: {rec.Owner.name}</p>}
              </div>
            ))
          }
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

  const fromParam = searchParams.get("from");
  // `from=prospect:<id>` → back to that prospect (used when navigating
  // between prospects via Referrer / Related Contact links).
  const prospectBackId = fromParam?.startsWith("prospect:")
    ? fromParam.slice("prospect:".length)
    : null;
  const backNav: { label: string; href: string } =
    prospectBackId                 ? { label: "Prospect",   href: `/prospect/${prospectBackId}` }
    : fromParam === "dashboard"    ? { label: "Dashboard",  href: "/" }
    : fromParam === "people"       ? { label: "People",     href: "/people" }
    : fromParam === "leadership"   ? { label: "Leadership", href: "/leadership" }
    :                                { label: "Pipeline",   href: "/pipeline" };

  const [prospect,     setProspect]     = useState<ZohoProspectDetail | null>(null);
  const [notes,        setNotes]        = useState<ZohoNote[]>([]);
  const [stageHistory, setStageHistory] = useState<ZohoStageHistory[]>([]);
  const [attachments,  setAttachments]  = useState<ZohoAttachment[]>([]);
  const [tasks,        setTasks]        = useState<ZohoTask[]>([]);
  const [funded,       setFunded]       = useState<ZohoFundedRecord[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  const fetchAll = useCallback(async (isRetry = false) => {
    setLoading(true); setError(null);

    try {
      const [detailRes, notesRes, stageHistRes, attachRes, tasksRes, fundedRes] =
        await Promise.all([
          fetch(`/api/prospects/${id}`,               { credentials: "same-origin" }),
          fetch(`/api/prospects/${id}/notes`,         { credentials: "same-origin" }),
          fetch(`/api/prospects/${id}/stage-history`, { credentials: "same-origin" }),
          fetch(`/api/prospects/${id}/attachments`,   { credentials: "same-origin" }),
          fetch(`/api/prospects/${id}/tasks`,         { credentials: "same-origin" }),
          fetch(`/api/prospects/${id}/funded`,        { credentials: "same-origin" }),
        ]);

      if (detailRes.status === 401 && !isRetry) {
        const ok = (await fetch("/api/auth/zoho/refresh", { method: "POST", credentials: "same-origin" })).ok;
        if (ok) return fetchAll(true);
        router.replace(`/login?next=/prospect/${id}`);
        return;
      }
      if (!detailRes.ok) {
        const body = (await detailRes.json()) as { error?: string };
        setError(body.error ?? "Failed to load prospect.");
        return;
      }

      const safe = async <T,>(res: Response, fallback: T): Promise<T> =>
        res.ok ? ((await res.json()) as { data: T }).data : fallback;

      const [detailData, notesData, stageHistData, attachData, tasksData, fundedData] =
        await Promise.all([
          (detailRes.json() as Promise<{ data: ZohoProspectDetail }>).then(j => j.data),
          safe<ZohoNote[]>(notesRes, []),
          safe<ZohoStageHistory[]>(stageHistRes, []),
          safe<ZohoAttachment[]>(attachRes, []),
          safe<ZohoTask[]>(tasksRes, []),
          safe<ZohoFundedRecord[]>(fundedRes, []),
        ]);

      setProspect(detailData);
      setNotes(notesData);
      setStageHistory(stageHistData);
      setAttachments(attachData);
      setTasks(tasksData);
      setFunded(fundedData);
    } catch {
      setError("Network error — could not load prospect.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // ── Mutation callbacks ────────────────────────────────────────────────────

  const updateProspect = useCallback(async (fields: Record<string, unknown>) => {
    const res = await makeRequest(`/api/prospects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Failed to update.");
    }
    setProspect(prev => prev ? { ...prev, ...fields } as ZohoProspectDetail : prev);
  }, [id]);

  const addNote = useCallback(async (title: string, content: string) => {
    const res = await makeRequest(`/api/prospects/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Failed to create note.");
    }
    const json = await res.json() as { data: ZohoNote };
    const currentUser = getCurrentUserRef();
    const note: ZohoNote = {
      ...json.data,
      Created_By: currentUser ?? json.data.Created_By,
    };
    setNotes(prev => [note, ...prev]);
  }, [id]);

  const editNote = useCallback(async (noteId: string, title: string, content: string) => {
    const res = await makeRequest(`/api/prospects/${id}/notes/${noteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Failed to update note.");
    }
    setNotes(prev => prev.map(n =>
      n.id === noteId ? { ...n, Note_Title: title.trim() || null, Note_Content: content.trim() } : n
    ));
  }, [id]);

  const deleteNote = useCallback(async (noteId: string) => {
    const res = await makeRequest(`/api/prospects/${id}/notes/${noteId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Failed to delete note.");
    }
    setNotes(prev => prev.filter(n => n.id !== noteId));
  }, [id]);

  const uploadAttachment = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await makeRequest(`/api/prospects/${id}/attachments`, { method: "POST", body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Upload failed.");
    }
    const json = await res.json() as { data: ZohoAttachment };
    setAttachments(prev => [...prev, json.data]);
  }, [id]);

  const deleteAttachment = useCallback(async (attachmentId: string) => {
    const res = await makeRequest(`/api/prospects/${id}/attachments/${attachmentId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Failed to delete attachment.");
    }
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  }, [id]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return <ProspectDetailSkeleton backLabel={backNav.label} />;
  }

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

  return (
    <div className="w-full overflow-x-hidden">
      <SetLastViewed
        id={prospect.id}
        fullName={prospect.Name}
        pipelineStage={ZOHO_TO_STAGE[prospect.Pipeline_Stage ?? ""] ?? null}
        organizationName={prospect.Company_Entity}
      />
      {/* Back link */}
      <div className="px-3 md:px-8 pt-3 md:pt-6">
        <Link href={backNav.href} className="text-xs text-muted-foreground hover:text-gold transition-colors">
          &larr; {backNav.label}
        </Link>
      </div>

      {/* Cockpit Zone — sticky */}
      <div className="sticky top-[33px] z-10 bg-background border-b px-3 md:px-8 py-3 md:py-4 space-y-2 md:space-y-3 overflow-hidden">
        <ProspectIdentityBar prospect={prospect} onUpdate={updateProspect} />
        {prospect.Pipeline_Stage !== "Funded" && (
          <ProspectNextActionBar prospect={prospect} onUpdate={updateProspect} onRefresh={fetchAll} />
        )}
        {prospect.Pipeline_Stage !== "Funded" && (
          <ProspectQuickLog
            prospectId={prospect.id}
            prospectName={prospect.Name ?? "prospect"}
            pipelineStage={
              prospect.Pipeline_Stage
                ? ZOHO_TO_STAGE[prospect.Pipeline_Stage] ?? null
                : null
            }
            nextActionType={null}
            nextActionDetail={prospect.Next_Action ?? null}
            nextActionDate={prospect.Next_Action_Date ?? null}
            onRefresh={fetchAll}
            onLocalSync={(fields) =>
              setProspect(prev =>
                prev ? ({ ...prev, ...fields } as ZohoProspectDetail) : prev,
              )
            }
          />
        )}
      </div>

      {/* Detail Zone */}
      <div className="px-3 md:px-8 py-4 md:py-6">
        <div className="flex flex-col lg:flex-row lg:gap-6">

          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-3 lg:space-y-5">
            <ProspectProfileCard prospect={prospect} onUpdate={updateProspect} />
            <div className="rounded-lg border bg-card p-3 lg:border-0 lg:rounded-none lg:bg-transparent lg:p-0">
              <ProspectActivityTimeline prospectId={id} />
            </div>
            <div className="rounded-lg border bg-card p-3 lg:border-0 lg:rounded-none lg:bg-transparent lg:p-0">
              <ProspectStageHistorySection history={stageHistory} />
            </div>
          </div>

          {/* Right column */}
          <div className="lg:w-[300px] xl:w-[340px] lg:shrink-0 mt-3 lg:mt-0 space-y-3 lg:space-y-5">
            <div className="rounded-lg border bg-card p-3 lg:border-0 lg:rounded-none lg:bg-transparent lg:p-0">
              <ProspectNotesSection
                notes={notes}
                onAdd={addNote}
                onEdit={editNote}
                onDelete={deleteNote}
              />
            </div>
            <div className="rounded-lg border bg-card p-3 lg:border-0 lg:rounded-none lg:bg-transparent lg:p-0">
              <ProspectTasksSection tasks={tasks} />
            </div>
            <div className="rounded-lg border bg-card p-3 lg:border-0 lg:rounded-none lg:bg-transparent lg:p-0">
              <ProspectAttachmentsSection
                attachments={attachments}
                prospectId={id}
                onUpload={uploadAttachment}
                onDelete={deleteAttachment}
              />
            </div>
            <div className="rounded-lg border bg-card p-3 lg:border-0 lg:rounded-none lg:bg-transparent lg:p-0">
              <ProspectFundedSection funded={funded} />
            </div>
            <div className="rounded-lg border bg-card p-3 lg:border-0 lg:rounded-none lg:bg-transparent lg:p-0">
              <ProspectRecordInfo prospect={prospect} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
