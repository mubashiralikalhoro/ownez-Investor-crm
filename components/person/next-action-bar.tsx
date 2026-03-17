"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { DateQuickPick } from "@/components/ui/date-quick-pick";
import { NEXT_ACTION_TYPES } from "@/lib/constants";
import { formatRelativeDate } from "@/lib/format";
import type { PersonWithComputed } from "@/lib/types";

export function NextActionBar({ person }: { person: PersonWithComputed }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [actionType, setActionType] = useState(person.nextActionType ?? "follow_up");
  const [detail, setDetail] = useState(person.nextActionDetail ?? "");
  const [date, setDate] = useState(person.nextActionDate ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/persons/${person.id}/next-action`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextActionType: actionType,
          nextActionDetail: detail,
          nextActionDate: date,
        }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div
        className="flex items-center gap-4 rounded-lg bg-gold/5 border border-gold/10 px-4 py-3 cursor-pointer hover:bg-gold/10 transition-colors"
        onClick={() => setEditing(true)}
      >
        <div className="text-[10px] font-medium uppercase tracking-wider text-gold">Next Action</div>
        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs font-medium text-navy">
            {NEXT_ACTION_TYPES.find((t) => t.key === person.nextActionType)?.label ?? "—"}
          </span>
          <span className="text-xs text-muted-foreground">{person.nextActionDetail ?? "—"}</span>
        </div>
        <span className={`text-xs font-medium ${person.isOverdue ? "text-alert-red" : "text-navy"}`}>
          {formatRelativeDate(person.nextActionDate)}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-gold/5 border border-gold/20 px-4 py-3 space-y-3">
      <div className="flex items-center gap-3">
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value as typeof actionType)}
          className="rounded-md border bg-card px-2 py-1.5 text-xs"
        >
          {NEXT_ACTION_TYPES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <Input
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="What needs to happen?"
          className="flex-1 text-xs h-8"
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
        />
      </div>
      <div className="flex items-center justify-between">
        <DateQuickPick value={date} onChange={setDate} />
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(false)}
            className="rounded-full px-3 py-1 text-[10px] text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-gold px-3 py-1 text-[10px] font-medium text-navy hover:bg-gold-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
