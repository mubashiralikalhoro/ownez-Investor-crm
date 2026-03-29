import Link from "next/link";
import { ProspectsPipeline } from "@/components/pipeline/prospects-pipeline";

export default function PipelinePage() {
  return (
    <div className="flex flex-col h-full p-6">
      <Link href="/" className="text-xs text-muted-foreground hover:text-gold transition-colors">
        &larr; Dashboard
      </Link>
      <h1 className="mt-2 mb-5 text-lg font-semibold text-navy">Pipeline</h1>
      <ProspectsPipeline />
    </div>
  );
}
