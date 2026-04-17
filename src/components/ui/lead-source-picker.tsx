"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";

const TOP_COUNT = 5;

interface LeadSourcePickerProps {
  value: string;
  onChange: (value: string) => void;
}

type SourceOption = { key: string; label: string };

export function LeadSourcePicker({ value, onChange }: LeadSourcePickerProps) {
  const [expanded, setExpanded]   = useState(false);
  const [sources, setSources]     = useState<SourceOption[]>([]);
  const [loading, setLoading]     = useState(true);
  const [adding, setAdding]       = useState(false);
  const [newLabel, setNewLabel]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError]   = useState<string | null>(null);

  // Fetch active sources from the DB-backed API on mount.
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/lead-sources", {
          credentials: "same-origin",
          signal:      controller.signal,
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          data?: { key: string; label: string; active: boolean }[];
        };
        setSources(
          (json.data ?? [])
            .filter((s) => s.active)
            .map((s) => ({ key: s.key, label: s.label })),
        );
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  async function submitNewSource() {
    const label = newLabel.trim();
    if (!label || submitting) return;
    setSubmitting(true);
    setAddError(null);
    try {
      const res = await fetch("/api/lead-sources", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "same-origin",
        body:        JSON.stringify({ key: label, label }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?:        { key: string; label: string };
        error?:       string;
        zohoWarning?: string;
      };

      if (res.status === 201 && json.data) {
        const added = { key: json.data.key, label: json.data.label };
        setSources((prev) => (prev.some((s) => s.key === added.key) ? prev : [...prev, added]));
        onChange(added.key);
        setAdding(false);
        setNewLabel("");
        return;
      }

      if (res.status === 409 && json.data) {
        // Silently select the existing source.
        const existing = { key: json.data.key, label: json.data.label };
        setSources((prev) => (prev.some((s) => s.key === existing.key) ? prev : [...prev, existing]));
        onChange(existing.key);
        setAdding(false);
        setNewLabel("");
        return;
      }

      setAddError(json.error || `Could not add source (${res.status}).`);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  const primary   = sources.slice(0, TOP_COUNT);
  const secondary = sources.slice(TOP_COUNT);
  const selectedInSecondary = secondary.some((s) => s.key === value);
  const showSecondary = expanded || selectedInSecondary;

  if (loading) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="h-7 w-20 rounded-full bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {primary.map((source) => (
          <Chip
            key={source.key}
            label={source.label}
            active={value === source.key}
            onClick={() => onChange(source.key)}
          />
        ))}
        {showSecondary && secondary.map((source) => (
          <Chip
            key={source.key}
            label={source.label}
            active={value === source.key}
            onClick={() => onChange(source.key)}
          />
        ))}
        {!showSecondary && secondary.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-0.5 rounded-full px-2.5 py-1.5 text-xs text-muted-foreground hover:text-navy hover:bg-muted transition-colors"
          >
            More <ChevronDown size={11} />
          </button>
        )}

        {!adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); setAddError(null); }}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 px-2.5 py-1.5 text-xs text-muted-foreground hover:border-gold hover:text-navy transition-colors"
          >
            <Plus size={11} /> New source
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); submitNewSource(); }
                if (e.key === "Escape") { setAdding(false); setNewLabel(""); setAddError(null); }
              }}
              placeholder="e.g. Podcast Guest"
              autoFocus
              disabled={submitting}
              className="flex-1 rounded-md border border-muted-foreground/25 bg-card px-2.5 py-1.5 text-xs outline-none focus:border-gold disabled:opacity-50"
            />
            <button
              type="button"
              onClick={submitNewSource}
              disabled={submitting || !newLabel.trim()}
              className="rounded-full bg-gold px-3 py-1.5 text-[11px] font-medium text-navy hover:bg-gold-hover disabled:opacity-50"
            >
              {submitting ? "Adding…" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setNewLabel(""); setAddError(null); }}
              disabled={submitting}
              className="rounded-full p-1.5 text-muted-foreground hover:text-navy"
              aria-label="Cancel"
            >
              <X size={12} />
            </button>
          </div>
          {addError && (
            <p className="text-[11px] text-alert-red">{addError}</p>
          )}
        </div>
      )}

      {showSecondary && secondary.length > 0 && !selectedInSecondary && (
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-navy ml-auto"
          >
            Less <ChevronUp size={10} />
          </button>
        </div>
      )}

      {sources.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground italic mt-2">
          No lead sources configured yet. Click <span className="text-navy">New source</span> to add one.
        </p>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-gold text-navy"
          : "bg-muted text-muted-foreground hover:bg-gold/15 hover:text-navy"
      }`}
    >
      {label}
    </button>
  );
}
