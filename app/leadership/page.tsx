import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/auth";
import { getDataService } from "@/lib/data";
import { StatColumn } from "@/components/leadership/stat-column";
import { PipelineFunnel } from "@/components/leadership/pipeline-funnel";
import { SourceROITable } from "@/components/leadership/source-roi-table";

export default async function LeadershipPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Auth guard: role or permission override
  if (session.role !== "marketing" && session.role !== "admin") {
    redirect("/");
  }

  const ds = await getDataService();
  const [stats, meetingsCount, funnel, sourceROI] = await Promise.all([
    ds.getLeadershipStats(),
    ds.getMeetingsCount(30),
    ds.getFunnelData(),
    ds.getSourceROI(),
  ]);

  return (
    <div className="p-8 max-w-[720px]">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-navy">Leadership</h1>
        <p className="text-sm text-muted-foreground">Fund performance &amp; pipeline overview</p>
      </div>

      <div className="flex gap-4 items-start">
        {/* Left: stat column */}
        <StatColumn stats={stats} meetingsCount={meetingsCount} />

        {/* Right: funnel + source ROI */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pipeline Funnel</h3>
          <PipelineFunnel funnel={funnel} />
          <SourceROITable rows={sourceROI} />
        </div>
      </div>
    </div>
  );
}
