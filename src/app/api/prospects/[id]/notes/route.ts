import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProspectNotes, createProspectNote } from "@/services/prospects";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

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
 * Body: { title?: string, content: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

  let body: { title?: string; content?: string };
  try {
    body = (await request.json()) as { title?: string; content?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) return NextResponse.json({ error: "content is required." }, { status: 422 });

  try {
    const note = await createProspectNote(session.accessToken, id, body.title ?? "", content);
    return NextResponse.json({ data: note }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create note.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
