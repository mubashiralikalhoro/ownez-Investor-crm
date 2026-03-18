import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getDataService } from "@/lib/data";
import { requireSession } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await request.json();

    const ds = await getDataService();
    const entity = await ds.createFundingEntity({
      entityName: body.entityName,
      entityType: body.entityType ?? "llc",
      personId: id,
      status: body.status ?? "pending_setup",
      einTaxId: body.einTaxId ?? null,
      notes: body.notes ?? null,
    });

    revalidatePath(`/person/${id}`);
    return NextResponse.json(entity, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
