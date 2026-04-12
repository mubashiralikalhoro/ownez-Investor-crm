import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateLeadSource, syncLeadSourceToZoho, deleteLeadSource } from "@/services/lead-sources";

/**
 * PUT /api/admin/lead-sources/[id]
 * Body: { active?: boolean, label?: string, syncToZoho?: boolean }
 *
 * When `syncToZoho: true`, retries pushing the source's key into Zoho's
 * Lead_Source picklist. Used by the "Sync" button shown on unsynced rows.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!session.permissions.canAccessAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 422 });
  }

  let body: { active?: boolean; label?: string; syncToZoho?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    // Retry Zoho sync if requested.
    if (body.syncToZoho) {
      const result = await syncLeadSourceToZoho(session.accessToken, numericId);
      return NextResponse.json({
        data:        result.row,
        zohoSynced:  result.zohoSynced,
        zohoWarning: result.zohoWarning,
      });
    }

    const row = await updateLeadSource(numericId, {
      active: body.active,
      label:  body.label,
    });
    return NextResponse.json({ data: row });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update lead source.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/lead-sources/[id]
 * Removes from Zoho picklist first (best-effort), then deletes the DB row.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!session.permissions.canAccessAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 422 });
  }

  try {
    const result = await deleteLeadSource(session.accessToken, numericId);
    return NextResponse.json({
      deleted:     result.deleted,
      zohoWarning: result.zohoWarning,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete lead source.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
