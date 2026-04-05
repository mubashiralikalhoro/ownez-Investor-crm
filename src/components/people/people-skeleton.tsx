import { Skeleton } from "@/components/ui/skeleton";

export function PeopleSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search input h-11 */}
      <Skeleton className="h-11 w-full rounded-md" />

      {/* Role filter pills + stage dropdown */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {[32, 48, 52, 60, 110].map((w, i) => (
            <Skeleton key={i} className="h-6 rounded-full" style={{ width: w }} />
          ))}
        </div>
        <Skeleton className="h-7 w-24 rounded-full ml-auto" />
      </div>

      {/* Count line */}
      <Skeleton className="h-3.5 w-16" />

      {/* List rows */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="divide-y">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
