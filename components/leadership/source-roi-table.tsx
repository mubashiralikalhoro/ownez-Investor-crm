"use client";

import { useState } from "react";
import { DrilldownSheet } from "./drilldown-sheet";
import { formatCurrency } from "@/lib/format";
import type { SourceROIRow, PersonWithComputed } from "@/lib/types";

interface SourceROITableProps {
  rows: SourceROIRow[];
}

interface DrilldownState {
  open: boolean;
  title: string;
  prospects: PersonWithComputed[];
}

export function SourceROITable({ rows }: SourceROITableProps) {
  const [drilldown, setDrilldown] = useState<DrilldownState>({ open: false, title: "", prospects: [] });

  async function openDrilldown(source: string, label: string) {
    const res = await fetch(`/api/leadership/drilldown?type=source&value=${encodeURIComponent(source)}`);
    const data: PersonWithComputed[] = await res.json();
    setDrilldown({ open: true, title: `${label} · ${data.length} prospect${data.length !== 1 ? "s" : ""}`, prospects: data });
  }

  return (
    <>
      <div className="mt-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Source ROI</h3>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Source</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Prospects</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Funded</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">AUM</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Conv%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.source}
                  onClick={() => openDrilldown(row.source, row.label)}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2 font-medium text-navy">{row.label}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{row.prospectCount}</td>
                  <td className="px-3 py-2 text-right">
                    {row.fundedCount > 0 ? (
                      <span className="text-green-600 font-medium">{row.fundedCount}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.aum > 0 ? (
                      <span className="font-bold text-navy">{formatCurrency(row.aum)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {row.conversionPct > 0 ? `${row.conversionPct}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DrilldownSheet
        open={drilldown.open}
        onClose={() => setDrilldown({ open: false, title: "", prospects: [] })}
        title={drilldown.title}
        prospects={drilldown.prospects}
      />
    </>
  );
}
