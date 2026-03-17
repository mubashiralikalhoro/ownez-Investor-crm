import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { STAGE_LABELS, NEXT_ACTION_TYPES } from "@/lib/constants";
import type { PersonWithComputed } from "@/lib/types";

interface TodaysActionsProps {
  people: PersonWithComputed[];
  needsAttentionCount: number;
  nextUpPerson: PersonWithComputed | null;
}

export function TodaysActions({ people, needsAttentionCount, nextUpPerson }: TodaysActionsProps) {
  const sorted = [...people].sort(
    (a, b) => (b.initialInvestmentTarget ?? 0) - (a.initialInvestmentTarget ?? 0)
  );

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-navy">Today&apos;s Actions</h2>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-healthy-green/30 bg-healthy-green-light p-6 text-center">
          <p className="text-sm font-medium text-healthy-green">All caught up.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {needsAttentionCount > 0 ? (
              <Link href="#needs-attention" className="text-gold hover:underline">
                {needsAttentionCount} prospect{needsAttentionCount > 1 ? "s" : ""} need attention
              </Link>
            ) : nextUpPerson ? (
              <>Pipeline healthy — next action is <Link href={`/person/${nextUpPerson.id}`} className="text-gold hover:underline">{nextUpPerson.fullName}</Link> on {nextUpPerson.nextActionDate}</>
            ) : (
              "Pipeline healthy — no upcoming actions"
            )}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Company</th>
                <th className="px-4 py-2.5 font-medium">Stage</th>
                <th className="px-4 py-2.5 font-medium text-right">Initial Investment</th>
                <th className="px-4 py-2.5 font-medium">Next Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((person) => (
                <tr key={person.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/person/${person.id}`} className="font-medium text-navy hover:text-gold transition-colors">
                      {person.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {person.organizationName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-[10px]">
                      {person.pipelineStage ? STAGE_LABELS[person.pipelineStage] : "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(person.initialInvestmentTarget)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {person.nextActionType && (
                      <span className="font-medium text-navy">
                        {NEXT_ACTION_TYPES.find(t => t.key === person.nextActionType)?.label}
                      </span>
                    )}
                    {person.nextActionDetail && (
                      <span className="ml-1.5">{person.nextActionDetail}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
