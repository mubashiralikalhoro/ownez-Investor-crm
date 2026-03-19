import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getDataService } from "@/lib/data";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSession();
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const ds = await getDataService();
    const stages = await ds.getPipelineStageConfigs();
    return NextResponse.json(stages);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const body = await request.json();
    const { key, ...data } = body;
    const ds = await getDataService();
    const updated = await ds.updatePipelineStageConfig(key, data);
    revalidatePath("/pipeline");
    revalidatePath("/admin");
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
