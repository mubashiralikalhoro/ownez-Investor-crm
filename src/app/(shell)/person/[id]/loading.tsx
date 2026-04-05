export default function PersonLoading() {
  return (
    <div className="max-w-[1100px]">
      <div className="px-8 pt-6">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="px-8 py-5 space-y-4">
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-14 animate-pulse rounded-lg bg-muted" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-muted" />
          ))}
        </div>
        <div className="h-10 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
