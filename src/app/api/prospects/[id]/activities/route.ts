import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { logTouchActivity } from "@/services/activity-log";
import { checkProspectAccess } from "@/lib/prospect-access";
import type { ActivityType } from "@/lib/types";

const VALID_TYPES: ActivityType[] = [
  "call", "email", "meeting", "note", "text_message",
  "linkedin_message", "whatsapp", "stage_change",
  "document_sent", "document_received", "reassignment",
];

/**
 * POST /api/prospects/[id]/activities
 * Generic touch-activity endpoint that writes to Activity_Log for any type.
 * Body: { type: ActivityType, description: string, outcome?: "connected"|"attempted",
 *         date?: string (YYYY-MM-DD), fulfillsCommitmentId?: string }
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
    type?:                string;
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

  const type = body.type as ActivityType | undefined;
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${VALID_TYPES.join(", ")}.` },
      { status: 422 },
    );
  }

  const description = body.description?.trim();
  if (!description) {
    return NextResponse.json({ error: "description is required." }, { status: 422 });
  }

  try {
    const activityId = await logTouchActivity(session.accessToken, id, {
      type,
      description,
      outcome:              body.outcome ?? null,
      date:                 body.date,
      fulfillsCommitmentId: body.fulfillsCommitmentId ?? null,
    });
    return NextResponse.json({ data: { id: activityId } }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to log activity.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
