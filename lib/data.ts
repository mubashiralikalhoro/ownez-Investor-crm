import type { DataService } from "./types";

let dataServiceInstance: DataService | null = null;

export async function getDataService(): Promise<DataService> {
  if (dataServiceInstance) return dataServiceInstance;

  const provider = process.env.DATA_PROVIDER ?? "mock";

  switch (provider) {
    case "mock": {
      const { createMockDataService } = await import("./providers/mock");
      dataServiceInstance = createMockDataService();
      break;
    }
    default:
      throw new Error(`Unknown data provider: ${provider}`);
  }

  return dataServiceInstance;
}
