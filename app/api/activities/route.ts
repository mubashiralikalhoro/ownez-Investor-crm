import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getDataService } from "@/lib/data";
import { requireSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const personId = request.nextUrl.searchParams.get("personId");
    if (!personId) {
      return NextResponse.json({ error: "personId is required" }, { status: 400 });
    }
    const ds = await getDataService();
    const activities = await ds.getActivities(personId);
    return NextResponse.json(activities);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

    revalidatePath(`/person/${personId}`);
    revalidatePath("/");
    return NextResponse.json(activity);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
