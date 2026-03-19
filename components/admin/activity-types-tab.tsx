"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import type { ActivityTypeConfig } from "@/lib/types";

interface ActivityTypesTabProps {
  types: ActivityTypeConfig[];
}

export function ActivityTypesTab({ types }: ActivityTypesTabProps) {
  const [items, setItems] = useState(types);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  function startEdit(type: ActivityTypeConfig) {
    setEditingKey(type.key);
    setEditLabel(type.label);
  }

  async function saveEdit(key: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/activity-types", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, label: editLabel }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((t) => (t.key === key ? updated : t)));
        setEditingKey(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(key: string, isActive: boolean) {
    const res = await fetch("/api/admin/activity-types", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, isActive: !isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((prev) => prev.map((t) => (t.key === key ? updated : t)));
    }
  }

  async function addNew() {
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/activity-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        setItems((prev) => [...prev, created]);
        setNewLabel("");
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Manage activity types available in Quick Log. System types (Stage Change, Reassignment) cannot be modified.
      </p>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Activity Type</th>
              <th className="px-4 py-2.5 font-medium w-20">Active</th>
              <th className="px-4 py-2.5 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((type) => (
              <tr key={type.key} className={`border-b last:border-0 ${type.isSystem ? "bg-muted/30" : ""}`}>
                {editingKey === type.key ? (
                  <>
                    <td className="px-4 py-2">
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="h-8 text-xs"
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(type.key); if (e.key === "Escape") setEditingKey(null); }}
                        autoFocus
                      />
                    </td>
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveEdit(type.key)}
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
                    <td className="px-4 py-2.5 text-xs font-medium text-navy">
                      {type.label}
                      {type.isSystem && (
                        <span className="ml-1.5 text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          System
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {!type.isSystem && (
                        <button
                          onClick={() => toggleActive(type.key, type.isActive)}
                          className={`w-8 h-4 rounded-full relative transition-colors ${type.isActive ? "bg-healthy-green" : "bg-muted"}`}
                        >
                          <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${type.isActive ? "left-4" : "left-0.5"}`} />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {!type.isSystem && (
                        <button
                          onClick={() => startEdit(type)}
                          className="text-[10px] text-muted-foreground hover:text-gold transition-colors"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add new */}
      <div className="flex items-center gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New activity type..."
          className="h-8 text-xs w-48"
          onKeyDown={(e) => { if (e.key === "Enter") addNew(); }}
        />
        <button
          onClick={addNew}
          disabled={adding || !newLabel.trim()}
          className="rounded-full bg-gold px-3 py-1.5 text-[10px] font-medium text-navy hover:bg-gold-hover disabled:opacity-50"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
