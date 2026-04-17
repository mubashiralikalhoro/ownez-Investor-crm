import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listActiveLeadSources, createLeadSource } from "@/services/lead-sources";
import { prisma } from "@/lib/prisma";

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

/**
 * POST /api/lead-sources
 * Body: { key: string, label?: string }
 *
 * Creates a new lead source. Open to any authenticated user so reps can
 * add a missing source inline from the prospect add/edit flow. Local row
 * is created first, then pushed to Zoho's picklist — if Zoho sync fails
 * the row still persists (with zohoSynced: false) and a warning is
 * returned.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: { key?: string; label?: string };
  try {
    body = (await request.json()) as { key?: string; label?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const key = body.key?.trim();
  if (!key) {
    return NextResponse.json({ error: "key is required." }, { status: 422 });
  }

  // Duplicate-key check returns 409 so the UI can silently select the existing row.
  const existing = await prisma.leadSource.findUnique({ where: { key } });
  if (existing) {
    return NextResponse.json(
      { error: "Lead source already exists.", data: existing },
      { status: 409 },
    );
  }

  try {
    const result = await createLeadSource(session.accessToken, {
      key,
      label: body.label,
    });
    return NextResponse.json(
      {
        data:        result.row,
        zohoSynced:  result.zohoSynced,
        zohoWarning: result.zohoWarning,
      },
      { status: 201 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create lead source.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
