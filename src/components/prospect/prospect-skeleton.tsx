import { Skeleton } from "@/components/ui/skeleton";

function CockpitSkeleton() {
  return (
    <div className="sticky top-[33px] z-10 bg-background border-b px-3 md:px-8 py-3 md:py-4 space-y-2 md:space-y-3">
      {/* Identity bar: name + badge + phone/email */}
      <div className="flex items-center gap-3 flex-wrap">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <div className="flex items-center gap-2 ml-auto">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      </div>
      {/* Next action bar */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-4 w-20 ml-auto" />
      </div>
    </div>
  );
}

function ProfileCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      {/* Stage progress bar */}
      <Skeleton className="h-2 w-full rounded-full" />
      {/* 3-col financial grid */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
      {/* Detail rows */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center justify-between py-1 border-t">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      ))}
    </div>
  );
}

function NotesSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <Skeleton className="h-5 w-16" />
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-md border p-3 space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-3/4" />
        </div>
      ))}
    </div>
  );
}

function SidebarSectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <Skeleton className="h-5 w-20" />
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-1">
          <Skeleton className="h-4 w-4 shrink-0" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

export function ProspectDetailSkeleton({ backLabel = "Pipeline" }: { backLabel?: string }) {
  return (
    <div className="w-full overflow-x-hidden">
      {/* Back link */}
      <div className="px-3 md:px-8 pt-3 md:pt-6">
        <Skeleton className="h-3.5 w-20" />
      </div>

      {/* Cockpit */}
      <CockpitSkeleton />

      {/* Detail zone */}
      <div className="px-3 md:px-8 py-4 md:py-6">
        <div className="flex flex-col lg:flex-row lg:gap-6">
          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-3 lg:space-y-5">
            <ProfileCardSkeleton />
            {/* Timeline */}
            <div className="rounded-lg border bg-card p-3 space-y-3">
              <Skeleton className="h-5 w-24" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3 py-1">
                  <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3.5 w-full" />
                  </div>
                </div>
              ))}
            </div>
            {/* Stage history */}
            <SidebarSectionSkeleton rows={3} />
          </div>

          {/* Right column */}
          <div className="lg:w-[300px] xl:w-[340px] lg:shrink-0 mt-3 lg:mt-0 space-y-3 lg:space-y-5">
            <NotesSkeleton />
            <SidebarSectionSkeleton rows={2} />
            <SidebarSectionSkeleton rows={2} />
            <SidebarSectionSkeleton rows={2} />
          </div>
        </div>
      </div>
    </div>
  );
}
