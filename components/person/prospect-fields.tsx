"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { LEAD_SOURCES, LOST_REASONS } from "@/lib/constants";
import { formatCurrency, getTodayCT } from "@/lib/format";
import type { PersonWithComputed, User } from "@/lib/types";

interface ProspectFieldsProps {
  person: PersonWithComputed;
  users: User[];
  sessionRole: string;
}

export function ProspectFields({ person, users, sessionRole }: ProspectFieldsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);

  async function saveField(field: string, value: unknown) {
    const body: Record<string, unknown> = { [field]: value };

    // Auto-set commitment date when committed amount changes
    if (field === "committedAmount" && value) {
      body.commitmentDate = getTodayCT();
    }

    await fetch(`/api/persons/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEditing(null);
    router.refresh();
  }

  function EditableField({
    label,
    field,
    value,
    format,
    type = "number",
    editable = true,
  }: {
    label: string;
    field: string;
    value: unknown;
    format?: (v: unknown) => string;
    type?: string;
    editable?: boolean;
  }) {
    const displayValue = format ? format(value) : String(value ?? "—");

    if (editing === field && editable) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
          <Input
            type={type}
            defaultValue={value != null ? String(value) : ""}
            className="text-xs h-7 flex-1"
            autoFocus
            onBlur={(e) => {
              const v = type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value;
              saveField(field, v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const target = e.target as HTMLInputElement;
                const v = type === "number" ? (target.value ? Number(target.value) : null) : target.value;
                saveField(field, v);
              }
              if (e.key === "Escape") setEditing(null);
            }}
          />
        </div>
      );
    }

    return (
      <div
        className={`flex items-center gap-2 ${editable ? "cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-0.5 rounded" : ""}`}
        onClick={() => editable && setEditing(field)}
      >
        <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
        <span className="text-xs font-medium tabular-nums">{displayValue}</span>
      </div>
    );
  }

  const isRep = sessionRole === "rep";
  const isAdmin = sessionRole === "admin";
  const canEdit = isRep || isAdmin;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-navy">Prospect Details</h3>
      <div className="space-y-1.5">
        <EditableField
          label="Investment Target"
          field="initialInvestmentTarget"
          value={person.initialInvestmentTarget}
          format={(v) => formatCurrency(v as number | null)}
          editable={canEdit}
        />
        <EditableField
          label="Growth Target"
          field="growthTarget"
          value={person.growthTarget}
          format={(v) => formatCurrency(v as number | null)}
          editable={canEdit}
        />
        <EditableField
          label="Committed Amount"
          field="committedAmount"
          value={person.committedAmount}
          format={(v) => formatCurrency(v as number | null)}
          editable={canEdit}
        />

        {/* Lead Source dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-32 shrink-0">Lead Source</span>
          {canEdit ? (
            <select
              value={person.leadSource ?? ""}
              onChange={(e) => saveField("leadSource", e.target.value || null)}
              className="rounded-md border bg-card px-2 py-0.5 text-xs"
            >
              <option value="">—</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-medium">
              {LEAD_SOURCES.find((s) => s.key === person.leadSource)?.label ?? "—"}
            </span>
          )}
        </div>

        {/* Assigned Rep - visible but only admin can edit */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-32 shrink-0">Assigned Rep</span>
          {isAdmin ? (
            <select
              value={person.assignedRepId ?? ""}
              onChange={(e) => saveField("assignedRepId", e.target.value || null)}
              className="rounded-md border bg-card px-2 py-0.5 text-xs"
            >
              <option value="">—</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-medium">{person.assignedRepName ?? "—"}</span>
          )}
        </div>

        {/* Lost Reason - only when dead */}
        {person.pipelineStage === "dead" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-32 shrink-0">Lost Reason</span>
            {canEdit ? (
              <select
                value={person.lostReason ?? ""}
                onChange={(e) => saveField("lostReason", e.target.value || null)}
                className="rounded-md border bg-card px-2 py-0.5 text-xs"
              >
                <option value="">—</option>
                {LOST_REASONS.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-medium">
                {LOST_REASONS.find((r) => r.key === person.lostReason)?.label ?? "—"}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
