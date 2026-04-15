"use client";

import { useState } from "react";
import { AlertCircle, Check, Plus, RefreshCw } from "lucide-react";
import type { LeadSourceRow } from "@/services/lead-sources";

interface LeadSourcesTabProps {
  sources: LeadSourceRow[];
}

export function LeadSourcesTab({ sources: initialSources }: LeadSourcesTabProps) {
  const [sources, setSources]     = useState(initialSources);
  const [addingNew, setAddingNew] = useState(false);
  const [newKey, setNewKey]       = useState("");
  const [newLabel, setNewLabel]   = useState("");
  const [saving, setSaving]       = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncing, setSyncing]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [warning, setWarning]     = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  async function addSource() {
    const key   = newKey.trim();
    const label = newLabel.trim() || key;
    if (!key) { setError("Source name is required."); return; }
    setSaving(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch("/api/admin/lead-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ key, label }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        data?: LeadSourceRow;
        zohoWarning?: string;
        error?: string;
      };
      if (!res.ok || !body.data) throw new Error(body.error || `Create failed (${res.status})`);
      setSources((prev) => [...prev, body.data!]);
      if (body.zohoWarning) setWarning(body.zohoWarning);
      setNewKey("");
      setNewLabel("");
      setAddingNew(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncOne(id: number) {
    setSyncingId(id);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch(`/api/admin/lead-sources/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ syncToZoho: true }),
      });
      const body = (await res.json()) as {
        data?: LeadSourceRow;
        zohoWarning?: string;
        error?: string;
      };
      if (!res.ok || body.error) {
        setError(body.error || `Sync failed (${res.status})`);
      } else if (body.zohoWarning) {
        setWarning(body.zohoWarning);
      } else if (body.data) {
        setSources((prev) => prev.map((s) => (s.id === id ? { ...s, zohoSynced: body.data!.zohoSynced } : s)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setSyncingId(null);
    }
  }

  async function handleSyncAll() {
    setSyncing(true);
    setError(null);
    setWarning(null);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/lead-sources/sync", {
        method: "POST",
        credentials: "same-origin",
      });
      const body = (await res.json()) as {
        added?: string[];
        removed?: string[];
        updated?: string[];
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || `Sync failed (${res.status})`);

      const parts: string[] = [];
      if (body.added?.length)   parts.push(`Added: ${body.added.join(", ")}`);
      if (body.updated?.length) parts.push(`Updated: ${body.updated.join(", ")}`);
      if (body.removed?.length) parts.push(`Removed: ${body.removed.join(", ")}`);
      setSyncResult(parts.length > 0 ? parts.join(". ") : "Everything is in sync.");

      const listRes = await fetch("/api/admin/lead-sources", { credentials: "same-origin" });
      if (listRes.ok) {
        const listBody = (await listRes.json()) as { data?: LeadSourceRow[] };
        if (listBody.data) setSources(listBody.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {sources.length} source{sources.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={handleSyncAll}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing…" : "Sync Zoho"}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-alert-red/25 bg-alert-red/5 px-3 py-2 text-xs text-alert-red">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {warning && (
        <div className="flex items-start gap-2 rounded-lg border border-gold/40 bg-gold/5 px-3 py-2 text-xs text-gold">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}
      {syncResult && (
        <div className="flex items-start gap-2 rounded-lg border border-healthy-green/40 bg-healthy-green/5 px-3 py-2 text-xs text-healthy-green">
          <Check size={14} className="shrink-0 mt-0.5" />
          <span>{syncResult}</span>
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        {sources.map((source) => (
          <div
            key={source.id}
            className="flex items-center gap-3 px-4 py-3 border-b last:border-0"
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm text-navy">{source.label}</span>
            </div>

            {!source.zohoSynced && (
              <>
                <span className="text-[10px] text-alert-red shrink-0">not synced</span>
                <button
                  onClick={() => handleSyncOne(source.id)}
                  disabled={syncingId === source.id}
                  className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[10px] font-medium text-gold hover:bg-gold/20 disabled:opacity-50 transition-colors shrink-0"
                >
                  <RefreshCw size={10} className={syncingId === source.id ? "animate-spin" : ""} />
                  {syncingId === source.id ? "Syncing…" : "Sync"}
                </button>
              </>
            )}
          </div>
        ))}

        {addingNew ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-gold/5 border-t">
            <input
              autoFocus
              value={newKey}
              onChange={(e) => { setNewKey(e.target.value); setNewLabel(e.target.value); }}
              placeholder="New source name (e.g. Partner Intro)"
              onKeyDown={(e) => {
                if (e.key === "Enter") addSource();
                if (e.key === "Escape") { setAddingNew(false); setNewKey(""); setNewLabel(""); setError(null); }
              }}
              className="flex-1 text-sm border-b border-gold outline-none bg-transparent text-navy placeholder:text-muted-foreground"
            />
            <button
              onClick={addSource}
              disabled={saving}
              className="text-xs px-3 py-1 rounded-full bg-gold text-navy font-medium hover:bg-gold-hover transition-colors disabled:opacity-50 shrink-0"
            >
              {saving ? "Adding…" : "Add"}
            </button>
            <button
              onClick={() => { setAddingNew(false); setNewKey(""); setNewLabel(""); setError(null); }}
              className="text-xs text-muted-foreground hover:text-navy transition-colors shrink-0"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingNew(true)}
            className="flex items-center gap-2 w-full px-4 py-3 text-sm text-muted-foreground hover:text-gold hover:bg-gold/5 transition-colors border-t"
          >
            <Plus size={14} />
            Add source
          </button>
        )}
      </div>
    </div>
  );
}
