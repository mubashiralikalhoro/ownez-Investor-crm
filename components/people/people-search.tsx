"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { STAGE_LABELS } from "@/lib/constants";
import type { PersonWithComputed, PersonRole } from "@/lib/types";

interface PeopleSearchProps {
  allPeople: PersonWithComputed[];
}

const ROLE_LABELS: Record<PersonRole, string> = {
  prospect: "Prospect",
  referrer: "Referrer",
  related_contact: "Related Contact",
  funded_investor: "Funded Investor",
};

const ROLE_FILTERS: { key: PersonRole | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "prospect", label: "Prospects" },
  { key: "funded_investor", label: "Funded" },
  { key: "referrer", label: "Referrers" },
  { key: "related_contact", label: "Related Contacts" },
];

export function PeopleSearch({ allPeople }: PeopleSearchProps) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<PersonRole | "all">("all");

  const filtered = allPeople.filter((p) => {
    const matchesQuery = !query ||
      p.fullName.toLowerCase().includes(query.toLowerCase()) ||
      (p.organizationName?.toLowerCase().includes(query.toLowerCase()) ?? false) ||
      (p.email?.toLowerCase().includes(query.toLowerCase()) ?? false);

    const matchesRole = roleFilter === "all" || p.roles.includes(roleFilter);

    return matchesQuery && matchesRole;
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, company, or email..."
          className="pl-9 h-11 text-sm"
          autoFocus
        />
      </div>

      <div className="flex gap-1.5">
        {ROLE_FILTERS.map((rf) => (
          <button
            key={rf.key}
            onClick={() => setRoleFilter(rf.key)}
            className={`rounded-full px-3 py-1 text-[10px] font-medium transition-colors ${
              roleFilter === rf.key
                ? "bg-navy text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {rf.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {query ? `No results for "${query}"` : "No people match your filters"}
          </p>
        ) : (
          <div className="divide-y">
            {filtered.map((person) => (
              <Link
                key={person.id}
                href={`/person/${person.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-navy">{person.fullName}</span>
                    {person.roles.map((role) => (
                      <Badge key={role} variant="secondary" className="text-[10px]">
                        {ROLE_LABELS[role]}
                      </Badge>
                    ))}
                  </div>
                  {(person.organizationName || person.contactCompany) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {person.organizationName ?? person.contactCompany}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {person.pipelineStage && person.roles.includes("prospect") && (
                    <Badge variant="secondary" className="text-[10px]">
                      {STAGE_LABELS[person.pipelineStage]}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
