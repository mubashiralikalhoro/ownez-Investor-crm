import { Badge } from "@/components/ui/badge";
import type { FundingEntity, PersonWithComputed } from "@/lib/types";

interface FundingEntitiesProps {
  entities: FundingEntity[];
  person: PersonWithComputed;
}

export function FundingEntitiesPanel({ entities, person }: FundingEntitiesProps) {
  const needsNudge =
    (person.pipelineStage === "commitment_processing" || person.pipelineStage === "kyc_docs") &&
    entities.length === 0;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-navy">Funding Entities</h3>

      {entities.length === 0 ? (
        <div>
          {needsNudge ? (
            <p className="text-xs text-gold italic">
              Consider adding a funding entity for this prospect
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">No entities linked</p>
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
        </div>
      )}
    </div>
  );
}
