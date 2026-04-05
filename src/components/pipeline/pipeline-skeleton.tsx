import { Skeleton } from "@/components/ui/skeleton";

function PipelineTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            {/* 10 column headers matching: Name, Company, Stage, Initial Inv., Growth Target, Source, Days Idle, Owner, Next Action, Date */}
            {[140, 100, 90, 80, 90, 80, 60, 80, 120, 70].map((w, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className={`h-3.5`} style={{ width: w }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(8)].map((_, row) => (
            <tr key={row} className="border-b last:border-0">
              {/* Name — with subtle link colour */}
              <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
              {/* Company */}
              <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
              {/* Stage badge */}
              <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
              {/* Initial Inv. */}
              <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
              {/* Growth Target */}
              <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
              {/* Source */}
              <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
              {/* Days Idle */}
              <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-8 ml-auto" /></td>
              {/* Owner */}
              <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
              {/* Next Action */}
              <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
              {/* Date */}
              <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Full page shimmer including filter bar — use when nothing is rendered yet */
export function PipelineSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-8 w-52 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>

      {/* Table */}
      <PipelineTableSkeleton />
    </div>
  );
}

/** Table-only shimmer — use when the filter bar is already rendered above */
export { PipelineTableSkeleton };
