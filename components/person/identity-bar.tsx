"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Plus, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/constants";
import type { PersonWithComputed } from "@/lib/types";

export function IdentityBar({ person }: { person: PersonWithComputed }) {
  const router = useRouter();
  const [editingField, setEditingField] = useState<"phone" | "email" | null>(null);
  const [fieldValue, setFieldValue] = useState("");

  async function saveContact(field: "phone" | "email") {
    const val = fieldValue.trim() || null;
    await fetch(`/api/persons/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: val }),
    });
    setEditingField(null);
    setFieldValue("");
    router.refresh();
  }

  function startEdit(field: "phone" | "email") {
    setEditingField(field);
    setFieldValue(field === "phone" ? (person.phone ?? "") : (person.email ?? ""));
  }

  return (
    <div>
      {/* Row 1: Name + stage + amount */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-lg md:text-xl font-semibold text-navy">{person.fullName}</h1>
        {(person.isStale || person.isOverdue) && (
          <span className="h-2.5 w-2.5 rounded-full bg-alert-red shrink-0" />
        )}
        {person.pipelineStage && (
          <Badge className="bg-gold/10 text-gold border-gold/20 text-[11px]">
            {STAGE_LABELS[person.pipelineStage]}
          </Badge>
        )}
        {person.initialInvestmentTarget && (
          <span className="text-sm font-medium tabular-nums text-muted-foreground">
            {formatCurrency(person.initialInvestmentTarget)}
          </span>
        )}
      </div>

      {/* Row 2: Organization */}
      {person.organizationName && (
        <p className="mt-0.5 text-sm text-muted-foreground">{person.organizationName}</p>
      )}

      {/* Row 3: Contact actions — always visible, always prominent */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {editingField === "phone" ? (
          <div className="flex items-center gap-1">
            <input
              type="tel"
              value={fieldValue}
              onChange={(e) => setFieldValue(e.target.value)}
              placeholder="(555) 123-4567"
              className="rounded-full border bg-white px-3 py-1.5 text-xs w-36 outline-none focus:border-gold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") saveContact("phone");
                if (e.key === "Escape") setEditingField(null);
              }}
            />
            <button
              onClick={() => saveContact("phone")}
              className="rounded-full bg-gold px-2 py-1 text-[10px] font-medium text-navy"
            >
              Save
            </button>
            <button onClick={() => setEditingField(null)} className="text-xs text-muted-foreground hover:text-navy">
              Cancel
            </button>
          </div>
        ) : person.phone ? (
          <div className="group inline-flex items-center gap-1">
            <a
              href={`tel:${person.phone}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-navy/8 px-3 py-1.5 text-xs font-medium text-navy hover:bg-gold/20 transition-colors"
            >
              <Phone size={12} />
              {person.phone}
            </a>
            <button
              onClick={() => startEdit("phone")}
              className="text-muted-foreground/25 hover:text-navy transition-colors"
              aria-label="edit phone"
            >
              <Pencil size={10} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => startEdit("phone")}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/30 px-3 py-1.5 text-xs text-muted-foreground hover:border-gold hover:text-gold transition-colors"
          >
            <Phone size={12} />
            <Plus size={10} />
          </button>
        )}

        {editingField === "email" ? (
          <div className="flex items-center gap-1">
            <input
              type="email"
              value={fieldValue}
              onChange={(e) => setFieldValue(e.target.value)}
              placeholder="name@example.com"
              className="rounded-full border bg-white px-3 py-1.5 text-xs w-48 outline-none focus:border-gold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") saveContact("email");
                if (e.key === "Escape") setEditingField(null);
              }}
            />
            <button
              onClick={() => saveContact("email")}
              className="rounded-full bg-gold px-2 py-1 text-[10px] font-medium text-navy"
            >
              Save
            </button>
            <button onClick={() => setEditingField(null)} className="text-xs text-muted-foreground hover:text-navy">
              Cancel
            </button>
          </div>
        ) : person.email ? (
          <div className="group inline-flex items-center gap-1">
            <a
              href={`mailto:${person.email}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-navy/8 px-3 py-1.5 text-xs font-medium text-navy hover:bg-gold/20 transition-colors"
            >
              <Mail size={12} />
              {person.email}
            </a>
            <button
              onClick={() => startEdit("email")}
              className="text-muted-foreground/25 hover:text-navy transition-colors"
              aria-label="edit email"
            >
              <Pencil size={10} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => startEdit("email")}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/30 px-3 py-1.5 text-xs text-muted-foreground hover:border-gold hover:text-gold transition-colors"
          >
            <Mail size={12} />
            <Plus size={10} />
          </button>
        )}
      </div>
    </div>
  );
}
