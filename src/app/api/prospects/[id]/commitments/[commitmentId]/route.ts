import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { closeCommitment } from "@/services/activity-log";
import { checkProspectAccess } from "@/lib/prospect-access";
import type { ZohoCommitmentStatus } from "@/types";

/**
 * PATCH /api/prospects/[id]/commitments/[commitmentId]
 * Body: { status: "fulfilled"|"superseded"|"cancelled", fulfilledByActivityId?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commitmentId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id, commitmentId } = await params;

  const denied = await checkProspectAccess(session, id);
  if (denied) return denied;

  let body: { status?: string; fulfilledByActivityId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const TERMINAL: ZohoCommitmentStatus[] = ["fulfilled", "superseded", "cancelled"];
  const status = body.status as ZohoCommitmentStatus | undefined;
  if (!status || !TERMINAL.includes(status)) {
    return NextResponse.json(
      { error: "status must be one of: fulfilled, superseded, cancelled." },
      { status: 422 },
    );
  }

  try {
    await closeCommitment(
      session.accessToken,
      commitmentId,
      status as Exclude<ZohoCommitmentStatus, "open">,
      body.fulfilledByActivityId ?? null,
    );
    return NextResponse.json({ data: { id: commitmentId, status } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to close commitment.";
    const httpStatus = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status: httpStatus });
  }
}
