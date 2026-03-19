"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/format";
import type { PersonWithComputed, RecentActivityEntry } from "@/lib/types";

interface DrilldownSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  prospects?: PersonWithComputed[];
  activities?: RecentActivityEntry[];
}

export function DrilldownSheet({ open, onClose, title, prospects, activities }: DrilldownSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-[400px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-navy text-base">{title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-1">
          {prospects && prospects.map((p) => (
            <Link
              key={p.id}
              href={`/person/${p.id}`}
              onClick={onClose}
              className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-muted transition-colors"
            >
              <div>
                <div className="text-sm font-medium text-navy">{p.fullName}</div>
                {p.pipelineStage && (
                  <div className="text-xs text-muted-foreground capitalize">
                    {p.pipelineStage.replace(/_/g, " ")}
                    {p.daysSinceLastTouch !== null && ` · ${p.daysSinceLastTouch}d idle`}
                  </div>
                )}
              </div>
              {p.initialInvestmentTarget && (
                <div className="text-sm font-medium text-navy">{formatCurrency(p.initialInvestmentTarget)}</div>
              )}
            </Link>
          ))}

          {activities && activities.map((a) => (
            <div key={a.id} className="px-3 py-2.5 border-b last:border-0">
              <div className="flex items-center justify-between">
                <Link
                  href={`/person/${a.personId}`}
                  onClick={onClose}
                  className="text-sm font-medium text-navy hover:text-gold transition-colors"
                >
                  {a.personName}
                </Link>
                <span className="text-xs text-muted-foreground">{a.date}</span>
              </div>
              {a.detail && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.detail}</p>
              )}
            </div>
          ))}

          {!prospects?.length && !activities?.length && (
            <p className="text-sm text-muted-foreground px-3 py-4">No data available.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
