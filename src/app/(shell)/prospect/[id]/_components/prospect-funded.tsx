"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, DollarSign } from "lucide-react";
import type { ZohoFundedRecord } from "@/types";

// ─── 11. Funded Investor Records ──────────────────────────────────────────────

export function ProspectFundedSection({ funded }: { funded: ZohoFundedRecord[] }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 w-full text-left group">
        {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
        <DollarSign size={14} className="text-emerald-600 shrink-0" />
        <h3 className="text-sm font-semibold text-navy">Funded Investor Records</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{funded.length}</span>
      </button>
      {expanded && (
        <div className="mt-3 pl-5 space-y-2">
          {funded.length === 0
            ? <p className="text-sm text-muted-foreground italic">No funded investor records.</p>
            : funded.map(rec => (
              <div key={rec.id} className="rounded-md border bg-card px-3 py-2.5 space-y-0.5">
                <p className="text-xs font-semibold text-navy">{rec.Name ?? "—"}</p>
                {rec.Email && <p className="text-[11px] text-muted-foreground">{rec.Email}</p>}
                {rec.Owner && <p className="text-[10px] text-muted-foreground">Owner: {rec.Owner.name}</p>}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
