import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProspectCalls } from "@/services/prospects";
import { logTouchActivity } from "@/services/activity-log";
import { checkProspectAccess } from "@/lib/prospect-access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

  const denied = await checkProspectAccess(session, id);
  if (denied) return denied;

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
 * Body: { description: string, outcome?: "connected"|"attempted", date?: string (YYYY-MM-DD), fulfillsCommitmentId?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

  const denied = await checkProspectAccess(session, id);
  if (denied) return denied;

  let body: {
    description?:         string;
    outcome?:             "connected" | "attempted";
    date?:                string;
    fulfillsCommitmentId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const description = body.description?.trim();
  if (!description) {
    return NextResponse.json({ error: "description is required." }, { status: 422 });
  }

  try {
    const activityId = await logTouchActivity(session.accessToken, id, {
      type:                 "call",
      description,
      outcome:              body.outcome ?? null,
      date:                 body.date,
      fulfillsCommitmentId: body.fulfillsCommitmentId ?? null,
    });
    return NextResponse.json({ data: { id: activityId } }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to log call.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
