import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listAllLeadSources, createLeadSource } from "@/services/lead-sources";

/**
 * GET /api/admin/lead-sources
 * Returns all lead sources (active + inactive) for the admin tab.
 */
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!session.permissions.canAccessAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const data = await listAllLeadSources();
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch lead sources.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/lead-sources
 * Body: { key: string, label?: string }
 * Creates a new lead source locally AND pushes it to Zoho's picklist.
 * If Zoho sync fails, the row is still saved with `zohoSynced: false` and
 * a `zohoWarning` is returned to the UI.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!session.permissions.canAccessAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

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
