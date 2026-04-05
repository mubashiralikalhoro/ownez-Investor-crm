import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProspectEmails } from "@/services/prospects";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

  try {
    const emails = await getProspectEmails(session.accessToken, id);
    return NextResponse.json({ data: emails });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch emails.";
    const status = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
