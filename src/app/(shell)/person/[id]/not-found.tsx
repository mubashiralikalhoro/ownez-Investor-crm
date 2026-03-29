import Link from "next/link";

export default function PersonNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-navy">Prospect not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The person you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-full bg-gold px-4 py-2 text-xs font-medium text-navy hover:bg-gold-hover"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
