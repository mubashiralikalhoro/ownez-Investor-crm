"use client";

import { formatCurrency } from "@/lib/format";
import type { ReferrerStats } from "@/lib/types";

interface TopReferrersProps {
  referrers: ReferrerStats[];
}

export function TopReferrers({ referrers }: TopReferrersProps) {
  if (referrers.length === 0) {
    return (
      <div className="mt-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top Referrers</h3>
        <p className="text-xs text-muted-foreground">No referrer data yet</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top Referrers</h3>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-[10px] text-muted-foreground uppercase tracking-wide">
              <th className="px-3 py-2">Referrer</th>
              <th className="px-3 py-2 text-right">Referrals</th>
              <th className="px-3 py-2 text-right">Pipeline</th>
              <th className="px-3 py-2 text-right">Funded</th>
            </tr>
          </thead>
          <tbody>
            {referrers.map((r) => (
              <tr key={r.referrerId} className="border-b last:border-0">
                <td className="px-3 py-2 font-medium text-navy">{r.referrerName}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.referralCount}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.pipelineValue)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-healthy-green">
                  {formatCurrency(r.fundedValue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
