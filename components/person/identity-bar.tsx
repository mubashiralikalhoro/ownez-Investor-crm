import { Badge } from "@/components/ui/badge";
import { Phone, Mail } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/constants";
import type { PersonWithComputed } from "@/lib/types";

export function IdentityBar({ person }: { person: PersonWithComputed }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-navy">{person.fullName}</h1>
          {(person.isStale || person.isOverdue) && (
            <span className="h-2.5 w-2.5 rounded-full bg-alert-red" />
          )}
        </div>
        {person.organizationName && (
          <p className="mt-0.5 text-sm text-muted-foreground">{person.organizationName}</p>
        )}
        <div className="mt-2 flex items-center gap-3">
          {person.pipelineStage && (
            <Badge className="bg-gold/10 text-gold border-gold/20 text-[11px]">
              {STAGE_LABELS[person.pipelineStage]}
            </Badge>
          )}
          {person.initialInvestmentTarget && (
            <span className="text-sm font-medium tabular-nums">
              {formatCurrency(person.initialInvestmentTarget)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {person.phone && (
          <a
            href={`tel:${person.phone}`}
            className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-navy hover:bg-gold/20 transition-colors"
          >
            <Phone size={12} />
            {person.phone}
          </a>
        )}
        {person.email && (
          <a
            href={`mailto:${person.email}`}
            className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-navy hover:bg-gold/20 transition-colors"
          >
            <Mail size={12} />
            {person.email}
          </a>
        )}
      </div>
    </div>
  );
}
