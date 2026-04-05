import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProspectById, updateProspectInZoho } from "@/services/prospects";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

  try {
    const prospect = await getProspectById(session.accessToken, id);
    return NextResponse.json({ data: prospect });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch prospect.";
    const status  = message.includes("(401)") ? 401 : message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT /api/prospects/[id]
 * Patch any subset of editable Prospect fields in Zoho CRM.
 * Body: { [field]: value, ... } — only included keys are updated.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

  let fields: Record<string, unknown>;
  try {
    fields = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!fields || typeof fields !== "object" || Array.isArray(fields) || Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "Body must be a non-empty object of field updates." }, { status: 422 });
  }

  try {
    await updateProspectInZoho(session.accessToken, id, fields);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update prospect.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
