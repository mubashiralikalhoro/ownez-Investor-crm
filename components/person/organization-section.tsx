"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Pencil, X } from "lucide-react";
import type { PersonWithComputed, Organization } from "@/lib/types";

export function OrganizationSection({
  person,
  orgMembers,
}: {
  person: PersonWithComputed;
  orgMembers: PersonWithComputed[];
}) {
  const router = useRouter();
  const others = orgMembers.filter((m) => m.id !== person.id);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Organization[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/organizations?q=${encodeURIComponent(search)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setResults(Array.isArray(data) ? data : []))
      .catch(() => {});
    return () => controller.abort();
  }, [search]);

  async function linkOrg(orgId: string) {
    setSaving(true);
    await fetch(`/api/persons/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: orgId }),
    });
    setEditing(false);
    setSaving(false);
    window.location.reload();
  }

  async function createAndLink() {
    if (!search.trim()) return;
    setSaving(true);
    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: search.trim(), type: "corporate", notes: null }),
    });
    const org = await res.json();
    await linkOrg(org.id);
  }

  async function unlinkOrg() {
    setSaving(true);
    await fetch(`/api/persons/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: null }),
    });
    setEditing(false);
    setSaving(false);
    window.location.reload();
  }

  if (editing) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold text-navy">Organization</h3>
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
                if (results.length === 1) {
                  linkOrg(results[0].id);
                } else if (results.length === 0) {
                  createAndLink();
                }
              }
              if (e.key === "Escape") setEditing(false);
            }}
          />
          {results.length > 0 && (
            <div className="rounded-lg border bg-card overflow-hidden max-h-40 overflow-y-auto">
              {results.map((org) => (
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
          {search.trim() && results.length === 0 && (
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
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-navy">Organization</h3>
      {person.organizationName ? (
        <div>
          <div
            className="group flex items-center gap-2 cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-0.5 rounded"
            onClick={() => setEditing(true)}
          >
            <p className="text-sm flex-1">{person.organizationName}</p>
            <Pencil size={10} className="text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors shrink-0" />
          </div>
          {others.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Other contacts at this org
              </p>
              {others.map((m) => (
                <p key={m.id} className="text-xs text-muted-foreground">{m.fullName}</p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-muted-foreground italic hover:text-gold transition-colors"
        >
          + Add organization
        </button>
      )}
    </div>
  );
}
