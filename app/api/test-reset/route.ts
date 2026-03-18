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
    return NextResponse.json({ ok: true });
  }

  // Fallback: clear the singleton so a fresh one is created from pristine module-level arrays
  clearDataService();
  return NextResponse.json({ ok: true, method: "singleton-clear" });
}
