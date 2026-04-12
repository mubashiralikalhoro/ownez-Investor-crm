import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listActiveLeadSources } from "@/services/lead-sources";

/**
 * GET /api/lead-sources
 *
 * Authenticated read of the active lead-source list. Used by every UI
 * component that needs a lead-source dropdown (pipeline filter, create
 * prospect sheet, leadership ROI labels, etc.).
 */
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const data = await listActiveLeadSources();
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch lead sources.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
