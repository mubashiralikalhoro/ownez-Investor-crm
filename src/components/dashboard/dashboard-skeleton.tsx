import { Skeleton } from "@/components/ui/skeleton";

function HeroCardSkeleton() {
  return (
    <div className="rounded-lg border-l-4 border-l-muted bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          {/* Name */}
          <Skeleton className="h-8 w-52" />
          {/* Meta row: company · badge · amount */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          {/* Action detail */}
          <Skeleton className="h-5 w-64" />
        </div>
      </div>
      {/* Bottom row: urgency badge + Open link */}
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
}

function ActionQueueSkeleton() {
  return (
    <div>
      {/* Section heading */}
      <Skeleton className="h-4 w-36 mb-3" />
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="divide-y">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-4 py-3">
              {/* Desktop row */}
              <div className="hidden md:flex items-center gap-4">
                <Skeleton className="h-4 w-4 shrink-0" />
                <Skeleton className="h-4 w-36 shrink-0" />
                <Skeleton className="h-5 w-20 rounded-full shrink-0" />
                <Skeleton className="h-4 w-16 ml-auto shrink-0" />
                <Skeleton className="h-5 w-20 rounded-full shrink-0" />
                <Skeleton className="h-4 w-40 shrink-0" />
              </div>
              {/* Mobile two-line */}
              <div className="flex md:hidden flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatsFooterSkeleton() {
  return (
    <div className="grid grid-cols-4 divide-x rounded-lg border bg-card">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 px-2 md:px-4 py-2.5 md:py-3">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-8">
      {/* Header: title + buttons */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-28" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </div>

      <div className="space-y-6">
        {/* Hero card */}
        <HeroCardSkeleton />

        {/* Action queue */}
        <ActionQueueSkeleton />

        {/* Stats footer */}
        <StatsFooterSkeleton />
      </div>
    </div>
  );
}
