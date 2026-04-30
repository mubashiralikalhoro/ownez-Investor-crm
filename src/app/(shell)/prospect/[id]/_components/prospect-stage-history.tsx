"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, TrendingUp } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { ZohoStageHistory } from "@/types";

// ─── 8. Pipeline Stage History ───────────────────────────────────────────────

export function ProspectStageHistorySection({ history }: { history: ZohoStageHistory[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 w-full text-left group">
        {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
        <TrendingUp size={14} className="text-gold shrink-0" />
        <h3 className="text-sm font-semibold text-navy">Pipeline Stage History</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{history.length} record{history.length !== 1 ? "s" : ""}</span>
      </button>
      {expanded && (
        <div className="mt-3 pl-5">
          {history.length === 0
            ? <p className="text-sm text-muted-foreground italic">No stage history.</p>
            : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-navy/70">Stage</th>
                      <th className="text-left px-3 py-2 font-semibold text-navy/70">Duration</th>
                      <th className="text-left px-3 py-2 font-semibold text-navy/70">Changed</th>
                      <th className="text-left px-3 py-2 font-semibold text-navy/70">By</th>
                      <th className="text-left px-3 py-2 font-semibold text-navy/70">Next Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {history.map(row => (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2"><span className="font-medium text-navy">{row.Pipeline_Stage ?? "—"}</span></td>
                        <td className="px-3 py-2 text-muted-foreground">{row.Duration_Days != null ? `${row.Duration_Days}d` : "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.Modified_Time ? formatDate(row.Modified_Time) : "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.Modified_By?.name ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {row.Next_Action
                            ? <span>{row.Next_Action}{row.Next_Action_Date ? <span className="ml-1 text-[10px] text-gold">({formatDate(row.Next_Action_Date)})</span> : null}</span>
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      )}
    </div>
  );
}
