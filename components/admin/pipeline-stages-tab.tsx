"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import type { PipelineStageConfig } from "@/lib/types";

interface PipelineStagesTabProps {
  stages: PipelineStageConfig[];
}

export function PipelineStagesTab({ stages }: PipelineStagesTabProps) {
  const [items, setItems] = useState(stages);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editThreshold, setEditThreshold] = useState<string>("");
  const [saving, setSaving] = useState(false);

  function startEdit(stage: PipelineStageConfig) {
    setEditingKey(stage.key);
    setEditLabel(stage.label);
    setEditThreshold(stage.idleThreshold !== null ? String(stage.idleThreshold) : "");
  }

  async function saveEdit(key: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pipeline-stages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          label: editLabel,
          idleThreshold: editThreshold === "" ? null : parseInt(editThreshold),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((s) => (s.key === key ? updated : s)));
        setEditingKey(null);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Configure pipeline stage labels and idle thresholds (days before a prospect is flagged as stale).
      </p>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Stage</th>
              <th className="px-4 py-2.5 font-medium w-28">Idle Threshold</th>
              <th className="px-4 py-2.5 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((stage) => (
              <tr key={stage.key} className="border-b last:border-0">
                {editingKey === stage.key ? (
                  <>
                    <td className="px-4 py-2">
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="h-8 text-xs"
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(stage.key); if (e.key === "Escape") setEditingKey(null); }}
                        autoFocus
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          value={editThreshold}
                          onChange={(e) => setEditThreshold(e.target.value)}
                          placeholder="None"
                          className="h-8 text-xs w-16"
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(stage.key); }}
                        />
                        <span className="text-[10px] text-muted-foreground">days</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveEdit(stage.key)}
                          disabled={saving}
                          className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-medium text-navy hover:bg-gold-hover disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="text-[10px] text-muted-foreground hover:text-navy px-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2.5 text-xs font-medium text-navy">{stage.label}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                      {stage.idleThreshold !== null ? `${stage.idleThreshold} days` : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => startEdit(stage)}
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
