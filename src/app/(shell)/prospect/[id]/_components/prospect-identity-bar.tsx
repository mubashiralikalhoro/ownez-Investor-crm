"use client";

import { Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import type { ZohoProspectDetail } from "@/types";
import { InlineTextField, InlinePhoneField } from "./inline-fields";

// ─── 2. Identity Bar ──────────────────────────────────────────────────────────

export function ProspectIdentityBar({
  prospect, onUpdate,
}: {
  prospect: ZohoProspectDetail;
  onUpdate: (fields: Record<string, unknown>) => Promise<void>;
}) {
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = prospect.Next_Action_Date != null && prospect.Next_Action_Date < today;
  const isStale = (prospect.Days_Since_Last_Touch ?? 0) > 14;

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        <InlineTextField
          value={prospect.Name}
          label="name"
          large
          onSave={val => val ? onUpdate({ Name: val }) : Promise.reject(new Error("Name is required"))}
        />
        {(isOverdue || isStale) && <span className="h-2.5 w-2.5 rounded-full bg-alert-red shrink-0" />}
        {prospect.Pipeline_Stage && (
          <Badge className="bg-gold/10 text-gold border-gold/20 text-[11px]">{prospect.Pipeline_Stage}</Badge>
        )}
        {prospect.Initial_Investment_Target && (
          <span className="text-sm font-medium tabular-nums text-muted-foreground">
            {formatCurrency(prospect.Initial_Investment_Target)}
          </span>
        )}
      </div>

      <div className="mt-0.5">
        <InlineTextField
          value={prospect.Company_Entity}
          label="company / entity"
          className="text-sm text-muted-foreground"
          onSave={val => onUpdate({ Company_Entity: val })}
        />
      </div>

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-navy/8 px-3 py-1.5 text-xs font-medium text-navy">
          <InlinePhoneField
            value={prospect.Phone}
            onSave={val => onUpdate({ Phone: val })}
          />
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-navy/8 px-3 py-1.5 text-xs font-medium text-navy">
          {prospect.Email ? (
            <a
              href={`mailto:${prospect.Email}`}
              aria-label={`Email ${prospect.Email}`}
              className="text-navy hover:text-gold transition-colors shrink-0"
              onClick={e => e.stopPropagation()}
            >
              <Mail size={12} />
            </a>
          ) : (
            <Mail size={12} />
          )}
          <InlineTextField
            value={prospect.Email}
            label="email"
            inputType="email"
            onSave={val => onUpdate({ Email: val })}
          />
        </span>
      </div>
    </div>
  );
}
