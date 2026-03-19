import { NextResponse } from "next/server";
import { getDataService, clearDataService } from "@/lib/data";

// POST /api/test-reset — resets mock data to initial state (dev/test only)
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const ds = await getDataService();
  if (ds.resetData) {
    ds.resetData();
  }

  // Always clear the singleton so the next request gets a fresh instance with all current methods
  clearDataService();
  return NextResponse.json({ ok: true });
}
