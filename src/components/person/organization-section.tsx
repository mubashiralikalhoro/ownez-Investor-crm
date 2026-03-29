"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Pencil, X } from "lucide-react";
import { demoData } from "@/data/store";
import type { PersonWithComputed, Organization } from "@/lib/types";

export function OrganizationSection({
  person,
  orgMembers,
}: {
  person: PersonWithComputed;
  orgMembers: PersonWithComputed[];
}) {
  const router = useRouter();
  // Exclude the current person and related contacts (they're shown in related contacts section)
  const others = orgMembers.filter(
    (m) => m.id !== person.id && !m.roles.includes("related_contact")
  );
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Organization[]>([]);
  const [saving, setSaving] = useState(false);

  const trimmedSearch = search.trim();

  useEffect(() => {
    if (!trimmedSearch) return;
    let cancelled = false;
    demoData
      .searchOrganizations(trimmedSearch)
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [trimmedSearch]);

  const resultsToShow = trimmedSearch ? results : [];

  async function linkOrg(orgId: string) {
    setSaving(true);
    await demoData.updatePerson(person.id, { organizationId: orgId });
    setEditing(false);
    setSaving(false);
    window.location.reload();
  }

  async function createAndLink() {
    if (!search.trim()) return;
    setSaving(true);
    const org = await demoData.createOrganization({
      name: search.trim(),
      type: "corporate",
      notes: null,
    });
    await linkOrg(org.id);
  }

  async function unlinkOrg() {
    setSaving(true);
    await demoData.updatePerson(person.id, { organizationId: null });
    setEditing(false);
    setSaving(false);
    window.location.reload();
  }

  if (editing) {
    return (
      <div className="space-y-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or type new org name..."
            className="text-sm h-9"
            autoFocus
            disabled={saving}
            onKeyDown={(e) => {
              if (e.key === "Enter" && search.trim()) {
                e.preventDefault();
                if (resultsToShow.length === 1) {
                  linkOrg(resultsToShow[0].id);
                } else if (resultsToShow.length === 0) {
                  createAndLink();
                }
              }
              if (e.key === "Escape") setEditing(false);
            }}
          />
          {resultsToShow.length > 0 && (
            <div className="rounded-lg border bg-card overflow-hidden max-h-40 overflow-y-auto">
              {resultsToShow.map((org) => (
                <button
                  key={org.id}
                  onClick={() => linkOrg(org.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                >
                  {org.name}
                </button>
              ))}
            </div>
          )}
          {trimmedSearch && resultsToShow.length === 0 && (
            <button
              onClick={createAndLink}
              disabled={saving}
              className="w-full rounded-lg border border-dashed border-gold/30 px-3 py-2 text-sm text-gold hover:bg-gold/5 transition-colors text-left"
            >
              + Create &ldquo;{search.trim()}&rdquo;
            </button>
          )}
          <div className="flex items-center gap-2">
            {person.organizationName && (
              <button
                onClick={unlinkOrg}
                disabled={saving}
                className="text-xs text-alert-red hover:underline"
              >
                Remove &ldquo;{person.organizationName}&rdquo;
              </button>
            )}
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-muted-foreground hover:text-navy ml-auto"
            >
              Cancel
            </button>
          </div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-28 shrink-0 tracking-wide">Organization</span>
        {person.organizationName ? (
          <div
            className="group flex items-center gap-2 cursor-pointer hover:bg-muted/30 -mx-1 px-1 py-0.5 rounded flex-1"
            onClick={() => setEditing(true)}
          >
            <p className="text-xs font-medium text-navy flex-1">{person.organizationName}</p>
            <Pencil size={9} className="text-transparent group-hover:text-muted-foreground/35 transition-colors shrink-0" />
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-muted-foreground/50 italic hover:text-gold transition-colors"
          >
            + Add
          </button>
        )}
      </div>
      {others.length > 0 && (
        <div className="pl-[calc(7rem+0.5rem)]">
          <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Also at this org</p>
          {others.map((m) => (
            <p key={m.id} className="text-[11px] text-muted-foreground">{m.fullName}</p>
          ))}
        </div>
      )}
    </div>
  );
}
