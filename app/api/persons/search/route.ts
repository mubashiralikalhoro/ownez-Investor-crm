import { NextRequest, NextResponse } from "next/server";
import { getDataService } from "@/lib/data";
import { requireSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const ds = await getDataService();
    const people = await ds.searchPeople(q);
    return NextResponse.json(people);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
