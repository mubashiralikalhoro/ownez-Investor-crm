import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProspectEvents } from "@/services/prospects";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const authHeader = request.headers.get("authorization") ?? "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!accessToken) return NextResponse.json({ error: "Missing access token." }, { status: 400 });

  const { id } = await params;

  try {
    const events = await getProspectEvents(accessToken, id);
    return NextResponse.json({ data: events });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch events.";
    const status = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
