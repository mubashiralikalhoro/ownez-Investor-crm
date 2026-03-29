export default function PipelineLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      <div className="h-6 w-32 animate-pulse rounded bg-muted" />
      <div className="flex gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-36 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border">
        <div className="h-10 animate-pulse bg-muted/50" />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-12 border-t animate-pulse bg-muted/20" />
        ))}
      </div>
    </div>
  );
}
