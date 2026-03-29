"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
import { LEAD_SOURCES, LOST_REASONS } from "@/lib/constants";
import { LeadSourcePicker } from "@/components/ui/lead-source-picker";
import { formatCurrency, getTodayCT } from "@/lib/format";
import { demoData } from "@/data/store";
import type { Person, PersonWithComputed, User } from "@/lib/types";

interface ProspectFieldsProps {
  person: PersonWithComputed;
  users: User[];
  sessionRole: string;
}

type EditableProspectFieldProps = {
  label: string;
  field: string;
  value: unknown;
  format?: (v: unknown) => string;
  type?: string;
  editable?: boolean;
  editingField: string | null;
  onBeginEdit: (field: string) => void;
  onCancelEdit: () => void;
  saveField: (field: string, value: unknown) => void | Promise<void>;
};

function EditableProspectField({
  label,
  field,
  value,
  format,
  type = "number",
  editable = true,
  editingField,
  onBeginEdit,
  onCancelEdit,
  saveField,
}: EditableProspectFieldProps) {
  const displayValue = format ? format(value) : String(value ?? "—");

  if (editingField === field && editable) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
        <Input
          type={type}
          defaultValue={value != null ? String(value) : ""}
          className="text-xs h-7 flex-1"
          autoFocus
          onBlur={(e) => {
            const raw = e.target.value.trim();
            const v = type === "number" ? (raw ? Number(raw) : null) : (raw || null);
            void saveField(field, v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const raw = (e.target as HTMLInputElement).value.trim();
              const v = type === "number" ? (raw ? Number(raw) : null) : (raw || null);
              void saveField(field, v);
            }
            if (e.key === "Escape") onCancelEdit();
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-2 ${editable ? "cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-0.5 rounded" : ""}`}
      onClick={() => editable && onBeginEdit(field)}
    >
      <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-xs font-medium tabular-nums flex-1">{displayValue}</span>
      {editable && (
        <Pencil size={10} className="text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors shrink-0" />
      )}
    </div>
  );
}

export function ProspectFields({ person, users, sessionRole }: ProspectFieldsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);

  async function saveField(field: string, value: unknown) {
    const body: Partial<Person> = { [field]: value } as Partial<Person>;
    if (field === "committedAmount" && value) {
      body.commitmentDate = getTodayCT();
    }
    await demoData.updatePerson(person.id, body);
    setEditing(null);
    router.refresh();
  }

  const isRep = sessionRole === "rep";
  const isAdmin = sessionRole === "admin";
  const canEdit = isRep || isAdmin;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-navy">Prospect Details</h3>
      <div className="space-y-1.5">
        <EditableProspectField
          label="Phone"
          field="phone"
          value={person.phone}
          type="tel"
          editable={canEdit}
          editingField={editing}
          onBeginEdit={setEditing}
          onCancelEdit={() => setEditing(null)}
          saveField={saveField}
        />
        <EditableProspectField
          label="Email"
          field="email"
          value={person.email}
          type="email"
          editable={canEdit}
          editingField={editing}
          onBeginEdit={setEditing}
          onCancelEdit={() => setEditing(null)}
          saveField={saveField}
        />
        <EditableProspectField
          label="Investment Target"
          field="initialInvestmentTarget"
          value={person.initialInvestmentTarget}
          format={(v) => formatCurrency(v as number | null)}
          editable={canEdit}
          editingField={editing}
          onBeginEdit={setEditing}
          onCancelEdit={() => setEditing(null)}
          saveField={saveField}
        />
        <EditableProspectField
          label="Growth Target"
          field="growthTarget"
          value={person.growthTarget}
          format={(v) => formatCurrency(v as number | null)}
          editable={canEdit}
          editingField={editing}
          onBeginEdit={setEditing}
          onCancelEdit={() => setEditing(null)}
          saveField={saveField}
        />
        <EditableProspectField
          label="Committed Amount"
          field="committedAmount"
          value={person.committedAmount}
          format={(v) => formatCurrency(v as number | null)}
          editable={canEdit}
          editingField={editing}
          onBeginEdit={setEditing}
          onCancelEdit={() => setEditing(null)}
          saveField={saveField}
        />

        {/* Lead Source */}
        {editing === "leadSource" && canEdit ? (
          <div className="rounded-lg border bg-muted/30 p-3 -mx-2 space-y-2">
            <LeadSourcePicker
              value={person.leadSource ?? ""}
              onChange={(val) => saveField("leadSource", val || null)}
            />
            <button
              onClick={() => setEditing(null)}
              className="text-xs text-muted-foreground hover:text-navy"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div
            className={`group flex items-center gap-2 ${canEdit ? "cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-0.5 rounded" : ""}`}
            onClick={() => canEdit && setEditing("leadSource")}
          >
            <span className="text-xs text-muted-foreground w-32 shrink-0">Lead Source</span>
            <span className="text-xs font-medium flex-1">
              {LEAD_SOURCES.find((s) => s.key === person.leadSource)?.label ?? "—"}
            </span>
            {canEdit && (
              <Pencil size={10} className="text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors shrink-0" />
            )}
          </div>
        )}

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
