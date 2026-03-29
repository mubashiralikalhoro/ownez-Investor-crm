"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatRelativeDate, getTodayCT } from "@/lib/format";
import type { ZohoProspect } from "@/types";

interface PipelineTableProps {
  prospects: ZohoProspect[];
}

function isOverdue(nextActionDate: string | null): boolean {
  if (!nextActionDate) return false;
  return nextActionDate < getTodayCT();
}

function isStale(days: number | null): boolean {
  if (days === null) return false;
  return days > 14;
}

function stageBadgeClass(stage: string | null): string {
  if (!stage) return "bg-muted text-muted-foreground";
  const s = stage.toLowerCase();
  if (s.includes("funded")) return "bg-healthy-green/15 text-healthy-green";
  if (s.includes("commit") || s.includes("kyc")) return "bg-gold/15 text-gold-hover";
  if (s.includes("pitch") || s.includes("engagement")) return "bg-blue-100 text-blue-700";
  if (s.includes("dead") || s.includes("nurture")) return "bg-muted text-muted-foreground";
  return "bg-navy/10 text-navy";
}

export function PipelineTable({ prospects }: PipelineTableProps) {
  const TH = ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <th className={`px-4 py-3 font-medium whitespace-nowrap ${className ?? ""}`}>
      {children}
    </th>
  );

  if (prospects.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        No prospects match your filters
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground bg-muted/30">
            <TH>Name</TH>
            <TH>Company</TH>
            <TH>Stage</TH>
            <TH className="text-right">Initial Inv.</TH>
            <TH className="text-right">Growth Target</TH>
            <TH>Source</TH>
            <TH className="text-right">Days Idle</TH>
            <TH>Owner</TH>
            <TH>Next Action</TH>
            <TH>Date</TH>
          </tr>
        </thead>
        <tbody>
          {prospects.map((prospect) => {
            const stale = isStale(prospect.Days_Since_Last_Touch);
            const overdue = isOverdue(prospect.Next_Action_Date);
            const flagged = stale || overdue;

            return (
              <tr
                key={prospect.id}
                className={`border-b last:border-0 transition-colors hover:bg-muted/40 ${flagged ? "bg-alert-red/2" : ""}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {flagged && (
                      <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-alert-red" />
                    )}
                    <Link
                      href={`/prospect/${prospect.id}`}
                      className="font-medium text-navy hover:text-gold transition-colors"
                    >
                      {prospect.Name}
                    </Link>
                  </div>
                </td>

                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {prospect.Company_Entity ?? "—"}
                </td>

                <td className="px-4 py-3">
                  {prospect.Pipeline_Stage ? (
                    <Badge
                      className={`text-[10px] border-0 font-medium ${stageBadgeClass(prospect.Pipeline_Stage)}`}
                    >
                      {prospect.Pipeline_Stage}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>

                <td className="px-4 py-3 text-right tabular-nums text-xs">
                  {formatCurrency(prospect.Initial_Investment_Target)}
                </td>

                <td className="px-4 py-3 text-right tabular-nums text-xs">
                  {formatCurrency(prospect.Growth_Target)}
                </td>

                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {prospect.Lead_Source ?? "—"}
                </td>

                <td className="px-4 py-3 text-right tabular-nums text-xs">
                  <span className={stale ? "font-semibold text-alert-red" : ""}>
                    {prospect.Days_Since_Last_Touch ?? "—"}
                  </span>
                </td>

                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {prospect.Owner.name}
                </td>

                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                  {prospect.Next_Action ?? "—"}
                </td>

                <td className="px-4 py-3 text-xs">
                  <span className={overdue ? "font-semibold text-alert-red" : "text-muted-foreground"}>
                    {formatRelativeDate(prospect.Next_Action_Date)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
