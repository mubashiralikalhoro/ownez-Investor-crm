"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import type { ThresholdRow } from "@/services/pipeline-thresholds";

interface PipelineStagesTabProps {
  stages: ThresholdRow[];
}

export function PipelineStagesTab({ stages }: PipelineStagesTabProps) {
  const [items, setItems]             = useState(stages);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editThreshold, setEditThreshold] = useState<string>("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  function startEdit(row: ThresholdRow) {
    setEditingStage(row.stage);
    setEditThreshold(row.idleThreshold !== null ? String(row.idleThreshold) : "");
    setError(null);
  }

  async function saveEdit(stage: string) {
    setSaving(true);
    setError(null);
    const next = editThreshold === "" ? null : parseInt(editThreshold, 10);
    try {
      const res = await fetch("/api/admin/stages/thresholds", {
        method:      "PUT",
        headers:     { "Content-Type": "application/json" },
        credentials: "same-origin",
        body:        JSON.stringify({ stage, idleThreshold: next }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?:  ThresholdRow;
        error?: string;
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error || `Save failed (${res.status})`);
      }
      setItems((prev) => prev.map((s) => (s.stage === stage ? json.data! : s)));
      setEditingStage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Idle threshold (days) controls when a prospect in an active stage is flagged stale. Leave blank for stages that should never go stale.
      </p>
      {error && (
        <div className="rounded-md border border-alert-red/25 bg-alert-red/5 px-3 py-2 text-xs text-alert-red">
          {error}
        </div>
      )}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Stage</th>
              <th className="px-4 py-2.5 font-medium w-32">Idle Threshold</th>
              <th className="px-4 py-2.5 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.stage} className="border-b last:border-0">
                <td className="px-4 py-2.5 text-xs font-medium text-navy">{row.label}</td>
                {editingStage === row.stage ? (
                  <>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          value={editThreshold}
                          onChange={(e) => setEditThreshold(e.target.value)}
                          placeholder="None"
                          className="h-8 text-xs w-20"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter")  saveEdit(row.stage);
                            if (e.key === "Escape") { setEditingStage(null); setError(null); }
                          }}
                        />
                        <span className="text-[10px] text-muted-foreground">days</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveEdit(row.stage)}
                          disabled={saving}
                          className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-medium text-navy hover:bg-gold-hover disabled:opacity-50"
                        >
                          {saving ? "…" : "Save"}
                        </button>
                        <button
                          onClick={() => { setEditingStage(null); setError(null); }}
                          className="text-[10px] text-muted-foreground hover:text-navy px-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                      {row.idleThreshold !== null ? `${row.idleThreshold} days` : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => startEdit(row)}
                        className="text-[10px] text-muted-foreground hover:text-gold transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
