import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateProspectNote, deleteProspectNote } from "@/services/prospects";

/**
 * PUT /api/prospects/[id]/notes/[noteId]
 * Body: { title?: string, content: string }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { noteId } = await params;

  let body: { title?: string; content?: string };
  try {
    body = (await request.json()) as { title?: string; content?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) return NextResponse.json({ error: "content is required." }, { status: 422 });

  try {
    await updateProspectNote(session.accessToken, noteId, body.title ?? "", content);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update note.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/prospects/[id]/notes/[noteId]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { noteId } = await params;

  try {
    await deleteProspectNote(session.accessToken, noteId);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete note.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
