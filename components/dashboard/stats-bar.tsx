import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { DashboardStats } from "@/lib/types";

export function StatsBar({ stats }: { stats: DashboardStats }) {
  const cards = [
    { label: "Active Pipeline", value: String(stats.activePipelineCount), subtitle: "prospects" },
    { label: "Pipeline Value", value: formatCurrency(stats.pipelineValue), subtitle: "initial targets" },
    { label: "Committed", value: formatCurrency(stats.committedValue), subtitle: "verbal + processing" },
    { label: "Funded YTD", value: formatCurrency(stats.fundedYTD), subtitle: "invested" },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="p-5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {card.label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-navy">
            {card.value}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{card.subtitle}</p>
        </Card>
      ))}
    </div>
  );
}
