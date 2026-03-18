import Link from "next/link";
import { getDataService } from "@/lib/data";
import { ACTIVE_PIPELINE_STAGES } from "@/lib/constants";
import { PipelineTable } from "@/components/pipeline/pipeline-table";

export default async function PipelinePage() {
  const ds = await getDataService();
  const people = await ds.getPeople({
    roles: ["prospect"],
    pipelineStages: ACTIVE_PIPELINE_STAGES,
  });

  return (
    <div className="p-8 max-w-[1400px]">
      <Link href="/" className="text-xs text-muted-foreground hover:text-gold transition-colors">
        &larr; Dashboard
      </Link>
      <h1 className="mt-2 mb-6 text-lg font-semibold text-navy">Pipeline</h1>
      <PipelineTable people={people} />
    </div>
  );
}
