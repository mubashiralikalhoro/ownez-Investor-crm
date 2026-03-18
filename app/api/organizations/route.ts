import { NextRequest, NextResponse } from "next/server";
import { getDataService } from "@/lib/data";
import { requireSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const ds = await getDataService();
    const orgs = await ds.searchOrganizations(q);
    return NextResponse.json(orgs);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();
    const ds = await getDataService();
    const org = await ds.createOrganization(body);
    return NextResponse.json(org, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
