"use client";

import { useState } from "react";
import { DateQuickPick } from "@/components/ui/date-quick-pick";
import { NEXT_ACTION_TYPES } from "@/lib/constants";
import { formatRelativeDate } from "@/lib/format";
import { Pencil } from "lucide-react";
import type { PersonWithComputed } from "@/lib/types";

function EditNextAction({
  person,
  onSave,
  onCancel,
}: {
  person: PersonWithComputed;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [actionType, setActionType] = useState(person.nextActionType ?? "follow_up");
  const [detail, setDetail] = useState("");
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
          nextActionDetail: detail.trim() || person.nextActionDetail,
          nextActionDate: date,
        }),
      });
      onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-muted px-3 py-3 space-y-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-gold">Edit Next Action</p>
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3">
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value as typeof actionType)}
          className="rounded-md border border-border px-2 py-1.5 text-sm"
          name="next-action-type"
        >
          {NEXT_ACTION_TYPES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <input
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder={person.nextActionDetail || "What needs to happen?"}
          name="next-action-detail"
          autoComplete="off"
          className="flex-1 text-sm h-9 rounded-md border border-border px-2.5 placeholder:text-muted-foreground"
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          autoFocus
        />
      </div>
      <DateQuickPick value={date} onChange={setDate} />
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/80"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-navy hover:bg-gold-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

export function NextActionBar({ person }: { person: PersonWithComputed }) {
  const [editing, setEditing] = useState(false);

  const actionLabel = NEXT_ACTION_TYPES.find((t) => t.key === person.nextActionType)?.label ?? "—";
  const isUrgent = person.isOverdue || person.isStale;
  const hasActivities = person.activityCount > 0;

  if (editing) {
    return (
      <EditNextAction
        key="edit"
        person={person}
        onSave={() => { setEditing(false); window.location.reload(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  // No activities yet — nudge to log first
  if (!hasActivities && !(person.nextActionType && person.nextActionDetail)) {
    return (
      <div className="rounded-lg border border-dashed border-gold/30 bg-gold/5 px-3 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gold">Next Action</p>
        <p className="text-sm text-muted-foreground mt-1">
          Log your first activity above to set a next action.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {isUrgent && (
        <div className="rounded-t-lg bg-alert-red/8 border border-b-0 border-alert-red/15 px-3 py-1 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-alert-red shrink-0" />
          <span className="text-[11px] font-medium text-alert-red">
            {person.isOverdue
              ? formatRelativeDate(person.nextActionDate)
              : `Stale — ${person.daysSinceLastTouch}d idle`}
          </span>
        </div>
      )}
      <div
        className={`${isUrgent ? "rounded-b-lg border border-t-0 border-alert-red/15" : "rounded-lg border border-gold/15"} bg-gold/5 px-3 py-2 cursor-pointer hover:bg-gold/10 transition-colors`}
        onClick={() => setEditing(true)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gold">Next Action</p>
            <p className="text-sm font-semibold text-navy">{actionLabel}</p>
            {person.nextActionDetail && (
              <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">{person.nextActionDetail}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {!isUrgent && person.nextActionDate && (
              <span className="text-xs font-medium text-navy">
                {formatRelativeDate(person.nextActionDate)}
              </span>
            )}
            <Pencil size={12} className="text-muted-foreground/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
