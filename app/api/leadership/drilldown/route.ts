import { NextRequest, NextResponse } from "next/server";
import { getDataService } from "@/lib/data";
import { requireSession } from "@/lib/auth";
import type { PipelineStage } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const value = searchParams.get("value");
    const days = parseInt(searchParams.get("days") ?? "30", 10);

    const ds = await getDataService();

    if (type === "kpi" && value === "meetings") {
      const data = await ds.getDrilldownActivities({ activityType: "meeting", days });
      return NextResponse.json(data);
    }

    if (type === "stage" && value) {
      const data = await ds.getDrilldownProspects({ stage: value as PipelineStage });
      return NextResponse.json(data);
    }

    if (type === "kpi" && (value === "fundedYTD" || value === "fundedAll")) {
      const data = await ds.getDrilldownProspects(value === "fundedAll" ? { fundedAll: true } : { fundedYTD: true });
      // Enrich each prospect with their actual funded amount
      const enriched = await Promise.all(
        data.map(async (p) => {
          const investments = await ds.getFundedInvestments(p.id);
          const fundedAmount = investments.reduce((sum, fi) => sum + fi.amountInvested, 0);
          return { ...p, fundedAmount };
        })
      );
      return NextResponse.json(enriched);
    }

    if (type === "kpi" && value === "active") {
      const data = await ds.getDrilldownProspects({ active: true });
      return NextResponse.json(data);
    }

    if (type === "source" && value) {
      const data = await ds.getDrilldownProspects({ leadSource: value });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid drilldown type" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
