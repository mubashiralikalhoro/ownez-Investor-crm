import { formatCurrency } from "@/lib/format";
import type { DashboardStats } from "@/lib/types";

export function StatsFooter({ stats }: { stats: DashboardStats }) {
  const items = [
    { label: "Pipeline", value: String(stats.activePipelineCount) },
    { label: "Value", value: formatCurrency(stats.pipelineValue) },
    { label: "Committed", value: formatCurrency(stats.committedValue) },
    { label: "Funded YTD", value: formatCurrency(stats.fundedYTD) },
  ];

  return (
    <div className="grid grid-cols-4 divide-x rounded-lg border bg-card">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center gap-0.5 px-2 md:px-4 py-2.5 md:py-3">
          <span className="text-[9px] md:text-xs font-medium uppercase tracking-wider text-muted-foreground text-center">
            {item.label}
          </span>
          <span className="text-sm font-semibold tabular-nums text-navy">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
