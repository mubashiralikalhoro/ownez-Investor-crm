import { NextResponse } from "next/server";
import { getDataService } from "@/lib/data";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    await requireSession();
    const ds = await getDataService();
    const users = await ds.getUsers();
    return NextResponse.json(users);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
