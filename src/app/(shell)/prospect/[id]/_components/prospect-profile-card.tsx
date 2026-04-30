"use client";

import { PROSPECT_PROFILE_FIELDS } from "@/lib/prospect-config";
import type { ZohoProspectDetail } from "@/types";
import { ProspectStageBar } from "./prospect-stage-bar";
import {
  InlineCurrencyField, InlineLeadSourceField, InlineLostReasonField,
  InlineProspectLookupField,
} from "./inline-fields";
import { formatFieldValue } from "./utils";

// ─── 4. Profile Card ──────────────────────────────────────────────────────────

export function ProspectProfileCard({
  prospect, onUpdate,
}: {
  prospect: ZohoProspectDetail;
  onUpdate: (fields: Record<string, unknown>) => Promise<void>;
}) {
  const financialFields = PROSPECT_PROFILE_FIELDS.filter(f => f.section === "financials");
  const detailFields = PROSPECT_PROFILE_FIELDS.filter(f => f.section === "details");
  const currentStage = prospect.Pipeline_Stage;

  const EDITABLE_FINANCIALS: Record<string, string> = {
    Initial_Investment_Target: "target",
    Growth_Target: "growth",
    Committed_Amount: "committed",
  };

  return (
    <div className="rounded-lg border bg-card">
      <ProspectStageBar
        stage={currentStage}
        onStageChange={async ({ newStage, nextAction, nextActionDate, reason }) => {
          const fields: Record<string, unknown> = { Pipeline_Stage: newStage };
          if (nextAction)     fields.Next_Action      = nextAction;
          if (nextActionDate) fields.Next_Action_Date = nextActionDate;
          if (reason)         fields.Lost_Dead_Reason = reason;
          await onUpdate(fields);
        }}
      />

      <div className="px-4 pb-4 space-y-3">
        {/* Financials grid */}
        <div className="grid grid-cols-3 gap-4 pt-3 pb-2 border-t">
          {financialFields.map(field => {
            const raw = (prospect as Record<string, unknown>)[field.api_name];
            const apiName = field.api_name;
            if (EDITABLE_FINANCIALS[apiName]) {
              return (
                <div key={apiName}>
                  <p className="text-[10px] text-muted-foreground tracking-wide mb-0.5">{field.label}</p>
                  <InlineCurrencyField
                    value={raw as number | null}
                    label={EDITABLE_FINANCIALS[apiName]}
                    onSave={val => onUpdate({ [apiName]: val })}
                  />
                </div>
              );
            }
            const formatted = formatFieldValue(raw, field.type);
            return (
              <div key={apiName}>
                <p className="text-[10px] text-muted-foreground tracking-wide mb-0.5">{field.label}</p>
                {formatted
                  ? <p className="text-sm font-semibold text-navy tabular-nums">{formatted}</p>
                  : <p className="text-xs text-muted-foreground/40 italic">Not set</p>}
              </div>
            );
          })}
        </div>

        {/* Detail rows — existing fields on the left, Referrer / Related
            Contact on the right, stacked into a two-column grid. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          <div className="space-y-2 min-w-0">
            {detailFields.map(field => {
              if (field.showForStages && currentStage && !field.showForStages.includes(currentStage)) return null;
              const raw = (prospect as Record<string, unknown>)[field.api_name];

              // Lead_Source: inline select
              if (field.api_name === "Lead_Source") {
                return (
                  <div key={field.api_name} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-28 shrink-0 tracking-wide">{field.label}</span>
                    <InlineLeadSourceField
                      value={raw as string | null}
                      onSave={val => onUpdate({ Lead_Source: val })}
                    />
                  </div>
                );
              }

              // Company entity: already editable in identity bar
              if (field.api_name === "Company_Entity") return null;

              // Lost/Dead reason: inline picklist (live from Zoho)
              if (field.api_name === "Lost_Dead_Reason") {
                return (
                  <div key={field.api_name} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-28 shrink-0 tracking-wide">{field.label}</span>
                    <InlineLostReasonField
                      value={raw as string | null}
                      onSave={val => onUpdate({ Lost_Dead_Reason: val })}
                    />
                  </div>
                );
              }

              const formatted = formatFieldValue(raw, field.type);
              if (!formatted) return null;
              return (
                <div key={field.api_name} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-28 shrink-0 tracking-wide">{field.label}</span>
                  <span className="text-xs font-medium text-navy flex-1 truncate">{formatted}</span>
                </div>
              );
            })}
          </div>

          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-28 shrink-0 tracking-wide">Referrer</span>
              <InlineProspectLookupField
                value={prospect.Referrer1}
                excludeId={prospect.id}
                onSave={val => onUpdate({ Referrer1: val })}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-28 shrink-0 tracking-wide">Related Contact</span>
              <InlineProspectLookupField
                value={prospect.Related_Contact}
                excludeId={prospect.id}
                onSave={val => onUpdate({ Related_Contact: val })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
