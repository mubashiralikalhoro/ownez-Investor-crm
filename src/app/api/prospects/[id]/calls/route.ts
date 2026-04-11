import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProspectCalls, createProspectCall } from "@/services/prospects";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

  try {
    const calls = await getProspectCalls(session.accessToken, id);
    return NextResponse.json({ data: calls });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch calls.";
    const status = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/prospects/[id]/calls
 * Body: { subject?: string, description?: string, callType?: "Outbound"|"Inbound"|"Missed", status?: "Completed"|"Scheduled" }
 * At least one of subject or description is required.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

  let body: {
    subject?:     string;
    description?: string;
    callType?:    "Outbound" | "Inbound" | "Missed";
    status?:      "Completed" | "Scheduled";
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const subject     = body.subject?.trim();
  const description = body.description?.trim();
  if (!subject && !description) {
    return NextResponse.json({ error: "subject or description is required." }, { status: 422 });
  }

  try {
    const callId = await createProspectCall(session.accessToken, id, {
      subject:     subject || description!.slice(0, 80),
      description: description,
      callType:    body.callType,
      status:      body.status,
    });
    return NextResponse.json({ data: { id: callId } }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create call.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
