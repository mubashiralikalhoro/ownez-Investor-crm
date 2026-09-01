import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProspectNotes } from "@/services/prospects";
import { logTouchActivity } from "@/services/activity-log";
import { checkProspectAccess } from "@/lib/prospect-access";
import type { ZohoNote } from "@/types";

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
 * Body: { content: string, title?: string, date?: string (YYYY-MM-DD), fulfillsCommitmentId?: string }
 *
 * Writes an Activity_Log row of type "Note" — the same store the activity
 * timeline reads, so a new note shows up in both places.
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

  let body: { content?: string; title?: string; date?: string; fulfillsCommitmentId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) return NextResponse.json({ error: "content is required." }, { status: 422 });

  const title = body.title?.trim() ?? "";

  try {
    const activityId = await logTouchActivity(session.accessToken, id, {
      type:                 "note",
      description:          content,
      date:                 body.date,
      fulfillsCommitmentId: body.fulfillsCommitmentId ?? null,
      name:                 title || null,
    });

    // Echo the full note shape so the client can insert it without a refetch.
    const now = new Date().toISOString();
    const note: ZohoNote = {
      id:            activityId,
      source:        "activity_log",
      Note_Title:    title || null,
      Note_Content:  content,
      Created_Time:  now,
      Modified_Time: now,
      Created_By:    null,
      Modified_By:   null,
      Owner:         null,
      Parent_Id:     null,
    };
    return NextResponse.json({ data: note }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create note.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
