import { demoData } from "./store";
import type { PipelineStage, PersonWithComputed, RecentActivityEntry } from "@/lib/types";

type ProspectWithFunded = PersonWithComputed & { fundedAmount?: number };

export async function runLeadershipDrilldown(
  type: string,
  value: string,
  days?: number
): Promise<PersonWithComputed[] | RecentActivityEntry[] | ProspectWithFunded[]> {
  const ds = demoData;

  if (type === "kpi" && value === "meetings") {
    return ds.getDrilldownActivities({ activityType: "meeting", days: days ?? 30 });
  }

  if (type === "stage" && value) {
    return ds.getDrilldownProspects({ stage: value as PipelineStage });
  }

  if (type === "kpi" && (value === "fundedYTD" || value === "fundedAll")) {
    const data = await ds.getDrilldownProspects(
      value === "fundedAll" ? { fundedAll: true } : { fundedYTD: true }
    );
    return Promise.all(
      data.map(async (p) => {
        const investments = await ds.getFundedInvestments(p.id);
        const fundedAmount = investments.reduce((sum, fi) => sum + fi.amountInvested, 0);
        return { ...p, fundedAmount };
      })
    );
  }

  if (type === "kpi" && value === "active") {
    return ds.getDrilldownProspects({ active: true });
  }

  if (type === "source" && value) {
    return ds.getDrilldownProspects({ leadSource: value });
  }

  return [];
}
