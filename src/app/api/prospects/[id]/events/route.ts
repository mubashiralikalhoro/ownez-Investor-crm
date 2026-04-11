import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProspectEvents, createProspectEvent } from "@/services/prospects";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

  try {
    const events = await getProspectEvents(session.accessToken, id);
    return NextResponse.json({ data: events });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch events.";
    const status = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/prospects/[id]/events
 * Body: { title: string, description?: string, start?: string (ISO), durationMinutes?: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

  let body: {
    title?:            string;
    description?:      string;
    start?:            string;
    durationMinutes?:  number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "title is required." }, { status: 422 });
  }

  const start = body.start ? new Date(body.start) : undefined;
  if (start && isNaN(start.getTime())) {
    return NextResponse.json({ error: "Invalid start datetime." }, { status: 422 });
  }

  try {
    const eventId = await createProspectEvent(session.accessToken, id, {
      title,
      description:     body.description,
      start,
      durationMinutes: body.durationMinutes,
    });
    return NextResponse.json({ data: { id: eventId } }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create event.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
