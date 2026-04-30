"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pencil, Loader2, Check, X } from "lucide-react";
import { formatCurrency, formatRelativeDate } from "@/lib/format";
import { useLostReasons } from "./use-lost-reasons";

// ─── Inline Edit Components ───────────────────────────────────────────────────

export interface InlineSaveProps {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  error: string | null;
}

export function InlineSaveBar({ saving, onSave, onCancel, error }: InlineSaveProps) {
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

export function InlineTextField({
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

export function InlinePhoneField({
  value, onSave,
}: {
  value: string | null | undefined;
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
    try { await onSave(draft.trim() || null); setEditing(false); }
    catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1">
        {value ? (
          <a
            href={`tel:${value}`}
            className="text-navy hover:text-gold transition-colors"
            data-zdialer-phone={value}
          >
            {value}
          </a>
        ) : (
          <button
            type="button"
            onClick={start}
            className="text-muted-foreground/40 italic text-xs hover:text-navy transition-colors"
          >
            Add phone
          </button>
        )}
        {value && (
          <button
            type="button"
            onClick={start}
            aria-label="Edit phone"
            className="opacity-30 hover:opacity-100 transition-opacity shrink-0"
          >
            <Pencil size={10} />
          </button>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <input
        type="tel"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
        autoFocus
        className="border border-gold/50 rounded-md px-2.5 py-1.5 text-sm text-navy bg-white focus:outline-none focus:ring-2 focus:ring-gold/40 shadow-sm w-44 md:w-56"
      />
      <InlineSaveBar saving={saving} onSave={save} onCancel={cancel} error={err} />
    </span>
  );
}

export function InlineCurrencyField({
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

export function InlineDateField({
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

export function InlineLeadSourceField({
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

export function InlineLostReasonField({
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

export type ProspectLookupValue = { id: string; name: string } | null;

export type ProspectSearchResult = { id: string; Name: string; Pipeline_Stage: string | null };

export function InlineProspectLookupField({
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
