"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ZohoProspectDetail } from "@/types";

// ─── 7. Record Info ───────────────────────────────────────────────────────────

export function ProspectRecordInfo({ prospect }: { prospect: ZohoProspectDetail }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-navy transition-colors">
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Record Info
      </button>
      {expanded && (
        <div className="mt-2 space-y-1.5 text-xs text-muted-foreground pl-5">
          <p><span className="font-medium text-navy/60">Zoho ID:</span> <span className="font-mono">{prospect.id}</span></p>
          {prospect.Owner.email && <p><span className="font-medium text-navy/60">Owner email:</span> {prospect.Owner.email}</p>}
          <p><span className="font-medium text-navy/60">Stale flag:</span> {prospect.Stale_Flag ? "Yes" : "No"}</p>
          <p><span className="font-medium text-navy/60">Archived:</span> {prospect.isArchived ? "Yes" : "No"}</p>
          {prospect.Record_Status__s && <p><span className="font-medium text-navy/60">Record status:</span> {prospect.Record_Status__s}</p>}
          {prospect.Currency && <p><span className="font-medium text-navy/60">Currency:</span> {prospect.Currency}</p>}
        </div>
      )}
    </div>
  );
}
