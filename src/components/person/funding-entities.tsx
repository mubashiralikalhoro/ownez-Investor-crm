"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { demoData } from "@/data/store";
import type { FundingEntity, PersonWithComputed, EntityType } from "@/lib/types";

const ENTITY_TYPES: { key: EntityType; label: string }[] = [
  { key: "llc", label: "LLC" },
  { key: "llp", label: "LLP" },
  { key: "trust", label: "Trust" },
  { key: "individual", label: "Individual" },
  { key: "corporation", label: "Corporation" },
  { key: "other", label: "Other" },
];

interface FundingEntitiesProps {
  entities: FundingEntity[];
  person: PersonWithComputed;
}

export function FundingEntitiesPanel({ entities, person }: FundingEntitiesProps) {
  const [adding, setAdding] = useState(false);
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState<EntityType>("llc");
  const [saving, setSaving] = useState(false);

  const needsNudge =
    (person.pipelineStage === "commitment_processing" || person.pipelineStage === "kyc_docs") &&
    entities.length === 0;

  async function handleAdd() {
    if (!entityName.trim()) return;
    setSaving(true);
    await demoData.createFundingEntity({
      entityName: entityName.trim(),
      entityType,
      personId: person.id,
      status: "active",
      einTaxId: null,
      notes: null,
    });
    setSaving(false);
    setAdding(false);
    setEntityName("");
    setEntityType("llc");
    window.location.reload();
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-navy">Funding Entities</h3>

      {entities.length === 0 && !adding ? (
        <div>
          {needsNudge ? (
            <button
              onClick={() => setAdding(true)}
              className="text-xs text-gold italic hover:underline"
            >
              + Add a funding entity for this prospect
            </button>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="text-xs text-muted-foreground italic hover:text-gold transition-colors"
            >
              + Add funding entity
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {entities.map((entity) => (
            <div key={entity.id} className="flex items-center justify-between rounded-md border p-2.5">
              <div>
                <p className="text-xs font-medium text-navy">{entity.entityName}</p>
                <p className="text-[10px] text-muted-foreground">{entity.entityType.toUpperCase()}</p>
              </div>
              <Badge
                variant="secondary"
                className={`text-[10px] ${
                  entity.status === "active" ? "text-healthy-green" :
                  entity.status === "pending_setup" ? "text-gold" : "text-muted-foreground"
                }`}
              >
                {entity.status.replace("_", " ")}
              </Badge>
            </div>
          ))}
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="text-xs text-muted-foreground hover:text-gold transition-colors"
            >
              + Add another
            </button>
          )}
        </div>
      )}

      {adding && (
        <div className="mt-2 rounded-lg border border-dashed border-gold/30 p-3 space-y-2">
          <Input
            value={entityName}
            onChange={(e) => setEntityName(e.target.value)}
            placeholder="Entity name (e.g. Smith Family Trust)"
            className="text-sm h-9"
            autoFocus
            disabled={saving}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <div className="flex items-center gap-2">
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as EntityType)}
              className="rounded-md border bg-card px-2.5 py-1.5 text-xs"
              disabled={saving}
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setAdding(false)}
                className="text-xs text-muted-foreground hover:text-navy"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!entityName.trim() || saving}
                className="rounded-full bg-gold px-3 py-1.5 text-xs font-medium text-navy hover:bg-gold-hover disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
