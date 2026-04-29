import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProspectById, getProspectVoiceCalls } from "@/services/prospects";
import { checkProspectAccess } from "@/lib/prospect-access";

/**
 * GET /api/prospects/[id]/voice-calls
 *
 * Returns Zoho Voice call logs filtered by the prospect's phone number(s).
 * Parallel surface to /api/prospects/[id]/calls — voice calls are returned
 * as raw Voice records, not as CRM Calls module rows.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

  const denied = await checkProspectAccess(session, id);
  if (denied) return denied;

  try {
    const prospect = await getProspectById(session.accessToken, id);
    const calls = await getProspectVoiceCalls(session.accessToken, [prospect.Phone]);
    return NextResponse.json({ data: calls });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch voice calls.";
    const status = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
