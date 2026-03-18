"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LEAD_SOURCES, LOST_REASONS } from "@/lib/constants";
import { formatCurrency, getTodayCT } from "@/lib/format";
import { LeadSourcePicker } from "@/components/ui/lead-source-picker";
import { StageBar } from "@/components/person/stage-bar";
import { OrganizationSection } from "@/components/person/organization-section";
import type { PersonWithComputed, User } from "@/lib/types";

interface ProfileCardProps {
  person: PersonWithComputed;
  users: User[];
  orgMembers: PersonWithComputed[];
  sessionRole: string;
}

export function ProfileCard({ person, users, orgMembers, sessionRole }: ProfileCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);

  const canEdit = sessionRole === "rep" || sessionRole === "admin";
  const isAdmin = sessionRole === "admin";

  async function saveField(field: string, value: unknown) {
    const body: Record<string, unknown> = { [field]: value };
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

  return (
    <div className="rounded-lg border bg-card">
      {/* Stage dots at top */}
      {person.pipelineStage && (
        <div className="px-4 pt-4 pb-2">
          <StageBar currentStage={person.pipelineStage} personId={person.id} />
        </div>
      )}

      {/* Main content grid */}
      <div className="px-4 pb-4 space-y-3">
        {/* Organization */}
        <div className="pt-1">
          <OrganizationSection person={person} orgMembers={orgMembers} />
        </div>

        {/* Financials row */}
        <div className="grid grid-cols-3 gap-3 py-2 border-t border-b">
          <FinancialCell
            label="Target"
            value={person.initialInvestmentTarget}
            field="initialInvestmentTarget"
            editing={editing}
            setEditing={setEditing}
            saveField={saveField}
            canEdit={canEdit}
          />
          <FinancialCell
            label="Growth"
            value={person.growthTarget}
            field="growthTarget"
            editing={editing}
            setEditing={setEditing}
            saveField={saveField}
            canEdit={canEdit}
          />
          <FinancialCell
            label="Committed"
            value={person.committedAmount}
            field="committedAmount"
            editing={editing}
            setEditing={setEditing}
            saveField={saveField}
            canEdit={canEdit}
          />
        </div>

        {/* Lead Source */}
        {editing === "leadSource" && canEdit ? (
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Lead Source</p>
            <LeadSourcePicker
              value={person.leadSource ?? ""}
              onChange={(val) => saveField("leadSource", val || null)}
            />
            <button onClick={() => setEditing(null)} className="text-xs text-muted-foreground hover:text-navy">
              Cancel
            </button>
          </div>
        ) : (
          <DetailRow
            label="Lead Source"
            value={LEAD_SOURCES.find((s) => s.key === person.leadSource)?.label ?? "—"}
            editable={canEdit}
            onClick={() => canEdit && setEditing("leadSource")}
          />
        )}

        {/* Assigned Rep */}
        {editing === "assignedRepId" && isAdmin ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-24 shrink-0">Rep</span>
            <select
              value={person.assignedRepId ?? ""}
              onChange={(e) => saveField("assignedRepId", e.target.value || null)}
              className="rounded-md border bg-white px-2 py-1 text-xs flex-1"
              autoFocus
            >
              <option value="">—</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </div>
        ) : (
          <DetailRow
            label="Rep"
            value={person.assignedRepName ?? "—"}
            editable={isAdmin}
            onClick={() => isAdmin && setEditing("assignedRepId")}
          />
        )}

        {/* Lost Reason — only when dead */}
        {person.pipelineStage === "dead" && (
          editing === "lostReason" && canEdit ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-24 shrink-0">Lost Reason</span>
              <select
                value={person.lostReason ?? ""}
                onChange={(e) => saveField("lostReason", e.target.value || null)}
                className="rounded-md border bg-white px-2 py-1 text-xs flex-1"
                autoFocus
              >
                <option value="">—</option>
                {LOST_REASONS.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <DetailRow
              label="Lost Reason"
              value={LOST_REASONS.find((r) => r.key === person.lostReason)?.label ?? "—"}
              editable={canEdit}
              onClick={() => canEdit && setEditing("lostReason")}
            />
          )
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  editable,
  onClick,
}: {
  label: string;
  value: string;
  editable: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-2 ${editable ? "cursor-pointer hover:bg-muted/50 -mx-1 px-1 py-0.5 rounded" : ""}`}
      onClick={onClick}
    >
      <span className="text-[10px] text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-xs font-medium text-navy flex-1">{value}</span>
      {editable && (
        <Pencil size={10} className="text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors shrink-0" />
      )}
    </div>
  );
}

function FinancialCell({
  label,
  value,
  field,
  editing,
  setEditing,
  saveField,
  canEdit,
}: {
  label: string;
  value: number | null;
  field: string;
  editing: string | null;
  setEditing: (v: string | null) => void;
  saveField: (field: string, value: unknown) => void;
  canEdit: boolean;
}) {
  if (editing === field && canEdit) {
    return (
      <div>
        <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
        <Input
          type="number"
          defaultValue={value != null ? String(value) : ""}
          className="text-xs h-7"
          autoFocus
          onBlur={(e) => {
            const raw = e.target.value.trim();
            saveField(field, raw ? Number(raw) : null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const raw = (e.target as HTMLInputElement).value.trim();
              saveField(field, raw ? Number(raw) : null);
            }
            if (e.key === "Escape") setEditing(null);
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`group ${canEdit ? "cursor-pointer hover:bg-muted/50 -mx-1 px-1 py-0.5 rounded" : ""}`}
      onClick={() => canEdit && setEditing(field)}
    >
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-navy tabular-nums">
        {formatCurrency(value)}
      </p>
    </div>
  );
}
