import type { DataService } from "@/lib/types";
import { demoData } from "./store";

export { demoData } from "./store";
export { enrichPerson } from "./demo-internal";
export { runLeadershipDrilldown } from "./leadership-drilldown";

export async function getDataService(): Promise<DataService> {
  return demoData;
}
