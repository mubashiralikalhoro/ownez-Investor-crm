import { NextRequest, NextResponse } from "next/server";
import { getDataService } from "@/lib/data";
import { requireSession } from "@/lib/auth";
import { LEAD_SOURCES } from "@/lib/constants";

// GET /api/lead-sources — returns sources sorted by frequency
export async function GET() {
  try {
    await requireSession();
    const ds = await getDataService();
    const counts = await ds.getLeadSourceCounts();

    const sorted = [...LEAD_SOURCES].sort((a, b) => {
      return (counts[b.key] ?? 0) - (counts[a.key] ?? 0);
    });

    return NextResponse.json({ sources: sorted, counts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
