import { PipelineSkeleton } from "@/components/pipeline/pipeline-skeleton";

export default function PipelineLoading() {
  return (
    <div className="p-4 md:p-6">
      <PipelineSkeleton />
    </div>
  );
}
