import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProspectNotes } from "@/services/prospects";
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
    const notes = await getProspectNotes(session.accessToken, id);
    return NextResponse.json({ data: notes });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch notes.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/prospects/[id]/notes
 * Body: { content: string, date?: string (YYYY-MM-DD), fulfillsCommitmentId?: string }
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

  let body: { content?: string; date?: string; fulfillsCommitmentId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) return NextResponse.json({ error: "content is required." }, { status: 422 });

  try {
    const activityId = await logTouchActivity(session.accessToken, id, {
      type:                 "note",
      description:          content,
      date:                 body.date,
      fulfillsCommitmentId: body.fulfillsCommitmentId ?? null,
    });
    return NextResponse.json({ data: { id: activityId } }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create note.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
