import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAllProspectsForPeople } from "@/services/prospects";

/**
 * GET /api/people
 *
 * Returns ALL Prospect records from Zoho (all stages, all pages) for use
 * in the People directory page.  No stage filter is applied so Dead, Funded,
 * and Nurture prospects are included alongside active ones.
 */
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const data = await getAllProspectsForPeople(session.accessToken);
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch people.";
    const status = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
