"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { FundingEntitiesPanel } from "./funding-entities";
import { RelatedContacts } from "./related-contacts";
import { ReferrerSection } from "./referrer-section";
import type { FundingEntity, PersonWithComputed, Person } from "@/lib/types";

interface RelationshipsSectionProps {
  person: PersonWithComputed;
  entities: FundingEntity[];
  relatedContacts: (Person & { relationRole: string })[];
  referrer: Person | null;
  referrals: PersonWithComputed[];
}

export function RelationshipsSection({
  person,
  entities,
  relatedContacts,
  referrer,
  referrals,
}: RelationshipsSectionProps) {
  const hasContent = entities.length > 0 || relatedContacts.length > 0 || referrer != null;
  const [expanded, setExpanded] = useState(hasContent);

  const count = [
    entities.length > 0,
    relatedContacts.length > 0,
    referrer != null,
  ].filter(Boolean).length;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        {expanded ? (
          <ChevronDown size={14} className="text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-muted-foreground shrink-0" />
        )}
        <h3 className="text-sm font-semibold text-navy">Relationships</h3>
        {!expanded && count > 0 && (
          <span className="text-[10px] text-muted-foreground">{count} linked</span>
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-5 pl-5">
          <ReferrerSection referrer={referrer} referrals={referrals} personId={person.id} />
          <FundingEntitiesPanel entities={entities} person={person} />
          <RelatedContacts contacts={relatedContacts} />
        </div>
      )}
    </div>
  );
}
