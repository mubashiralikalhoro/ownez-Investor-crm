import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getOpenCommitments, openCommitment } from "@/services/activity-log";
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
    const commitments = await getOpenCommitments(session.accessToken, id);
    return NextResponse.json({ data: commitments });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch commitments.";
    const status = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/prospects/[id]/commitments
 * Body: { type: string, detail: string, dueDate: string ("YYYY-MM-DD") }
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

  let body: { type?: string; detail?: string; dueDate?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const type   = body.type?.trim();
  const detail = body.detail?.trim();
  const dueDate = body.dueDate?.trim();

  if (!type)    return NextResponse.json({ error: "type is required."    }, { status: 422 });
  if (!detail)  return NextResponse.json({ error: "detail is required."  }, { status: 422 });
  if (!dueDate) return NextResponse.json({ error: "dueDate is required." }, { status: 422 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return NextResponse.json({ error: "dueDate must be YYYY-MM-DD." }, { status: 422 });
  }

  try {
    const commitmentId = await openCommitment(session.accessToken, id, { type, detail, dueDate });
    return NextResponse.json({ data: { id: commitmentId } }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create commitment.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
