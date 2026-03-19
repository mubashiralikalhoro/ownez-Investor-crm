import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getDataService } from "@/lib/data";
import { requireSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();
    const ds = await getDataService();
    await ds.reorderLeadSources(body.keys);
    revalidatePath("/admin");
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
