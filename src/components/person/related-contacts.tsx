"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { demoData } from "@/data/store";
import type { Person, PersonWithComputed } from "@/lib/types";

interface RelatedContactsProps {
  personId: string;
  contacts: (Person & { relationRole: string })[];
}

export function RelatedContacts({ personId, contacts }: RelatedContactsProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PersonWithComputed[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonWithComputed | null>(null);
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const trimmedSearch = search.trim();

  useEffect(() => {
    if (!trimmedSearch || selectedPerson) return;
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
  }, [trimmedSearch, personId, selectedPerson]);

  const resultsToShow = trimmedSearch && !selectedPerson ? results : [];

  async function handleAdd() {
    if (!selectedPerson || !role.trim()) return;
    setSaving(true);
    await demoData.addRelatedContact(personId, selectedPerson.id, role.trim());
    setSaving(false);
    setAdding(false);
    setSearch("");
    setSelectedPerson(null);
    setRole("");
    router.refresh();
  }

  async function handleRemove(contactId: string) {
    await demoData.removeRelatedContact(personId, contactId);
    router.refresh();
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-navy">Related Contacts</h3>

      {contacts.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground italic">No related contacts</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="rounded-md border p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-navy">{contact.fullName}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{contact.relationRole}</span>
                  <button
                    onClick={() => handleRemove(contact.id)}
                    aria-label={`remove ${contact.fullName}`}
                    title="remove"
                    className="text-muted-foreground/40 hover:text-alert-red transition-colors text-sm leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>
              {(contact.phone || contact.email || contact.contactCompany) && (
                <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                  {contact.contactCompany && <span>{contact.contactCompany}</span>}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="hover:text-gold">
                      {contact.phone}
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="hover:text-gold">
                      {contact.email}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="mt-2 rounded-lg border bg-muted/20 p-3 space-y-2">
          {selectedPerson ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-navy flex-1">{selectedPerson.fullName}</span>
              <button
                onClick={() => { setSelectedPerson(null); setSearch(""); }}
                className="text-[10px] text-muted-foreground hover:text-navy"
              >
                change
              </button>
            </div>
          ) : (
            <div>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people..."
                className="text-xs h-8"
                autoFocus
                disabled={saving}
              />
              {resultsToShow.length > 0 && (
                <div className="mt-1 rounded-lg border bg-card overflow-hidden max-h-40 overflow-y-auto">
                  {resultsToShow.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPerson(p); setSearch(p.fullName); setResults([]); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-medium text-navy">{p.fullName}</span>
                      {p.contactCompany && (
                        <span className="text-muted-foreground ml-2">{p.contactCompany}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role (e.g. Attorney, Spouse)"
            className="text-xs h-8"
            disabled={saving}
            onKeyDown={(e) => {
              if (e.key === "Enter" && selectedPerson && role.trim()) handleAdd();
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleAdd}
              disabled={!selectedPerson || !role.trim() || saving}
              className="rounded-full bg-gold px-3 py-1 text-[10px] font-medium text-navy hover:bg-gold/90 disabled:opacity-40"
            >
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setSearch(""); setSelectedPerson(null); setRole(""); }}
              className="text-xs text-muted-foreground hover:text-navy"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 text-xs text-muted-foreground italic hover:text-gold transition-colors"
        >
          + Add Contact
        </button>
      )}
    </div>
  );
}
