"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
import { demoData } from "@/data/store";
import type { Person, PersonWithComputed } from "@/lib/types";

interface ReferrerSectionProps {
  referrer: Person | null;
  referrals: PersonWithComputed[];
  personId: string;
}

export function ReferrerSection({ referrer, referrals, personId }: ReferrerSectionProps) {
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PersonWithComputed[]>([]);
  const [saving, setSaving] = useState(false);
  const trimmedSearch = search.trim();

  useEffect(() => {
    if (!trimmedSearch) return;
    let cancelled = false;
    demoData
      .searchPeople(trimmedSearch)
      .then((data) => {
        if (cancelled) return;
        const filtered = data.filter((p: PersonWithComputed) => p.id !== personId);
        setResults(filtered);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [trimmedSearch, personId]);

  const resultsToShow = trimmedSearch ? results : [];

  async function linkReferrer(referrerId: string) {
    setSaving(true);
    await demoData.addReferrer(personId, referrerId);
    setSaving(false);
    setEditing(false);
    window.location.reload();
  }

  async function createAndLink() {
    if (!search.trim()) return;
    setSaving(true);
    // Create a new person with role "referrer"
    const newPerson = await demoData.createPerson({
      fullName: search.trim(),
      roles: ["referrer"],
      pipelineStage: null,
    });
    await linkReferrer(newPerson.id);
  }

  if (editing) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold text-navy">Referrer</h3>
        <div className="space-y-2">
          {referrer && (
            <p className="text-xs text-muted-foreground">
              Current: <span className="font-medium text-navy">{referrer.fullName}</span>
            </p>
          )}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="text-sm h-9"
            autoFocus
            disabled={saving}
            onKeyDown={(e) => {
              if (e.key === "Enter" && search.trim()) {
                e.preventDefault();
                if (resultsToShow.length === 1) {
                  linkReferrer(resultsToShow[0].id);
                } else if (resultsToShow.length === 0) {
                  createAndLink();
                }
              }
              if (e.key === "Escape") setEditing(false);
            }}
          />
          {resultsToShow.length > 0 && (
            <div className="rounded-lg border bg-card overflow-hidden max-h-40 overflow-y-auto">
              {resultsToShow.map((p) => (
                <button
                  key={p.id}
                  onClick={() => linkReferrer(p.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium text-navy">{p.fullName}</span>
                  {p.contactCompany && (
                    <span className="text-xs text-muted-foreground ml-2">{p.contactCompany}</span>
                  )}
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
              + Create &ldquo;{search.trim()}&rdquo; as referrer
            </button>
          )}
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-muted-foreground hover:text-navy"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-navy">Referrer</h3>

      {referrer ? (
        <div>
          <div
            className="group flex items-center gap-2 cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-0.5 rounded"
            onClick={() => setEditing(true)}
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-navy">{referrer.fullName}</p>
              {referrer.contactCompany && (
                <p className="text-xs text-muted-foreground">{referrer.contactCompany}</p>
              )}
            </div>
            <Pencil size={10} className="text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors shrink-0" />
          </div>
          {referrals.length > 1 && (
            <div className="mt-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Other referrals
              </p>
              {referrals.map((r) => (
                <Link key={r.id} href={`/prospect/${r.id}`} className="block text-xs text-navy hover:text-gold">
                  {r.fullName}
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-muted-foreground italic hover:text-gold transition-colors"
        >
          + Add referrer
        </button>
      )}
    </div>
  );
}
