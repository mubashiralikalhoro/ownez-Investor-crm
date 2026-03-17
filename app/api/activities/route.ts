import { NextRequest, NextResponse } from "next/server";
import { getDataService } from "@/lib/data";
import { requireSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { personId, ...activityData } = body;

    if (!personId) {
      return NextResponse.json({ error: "personId is required" }, { status: 400 });
    }

    const ds = await getDataService();
    const activity = await ds.createActivity(personId, {
      ...activityData,
      loggedById: session.userId,
    });

    return NextResponse.json(activity);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
