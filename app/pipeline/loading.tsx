export default function PipelineLoading() {
  return (
    <div className="p-8 max-w-[1400px] space-y-6">
      <div className="h-6 w-24 animate-pulse rounded bg-muted" />
      <div className="space-y-2">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
