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
    const { contactId, role } = await request.json();

    if (!contactId || !role) {
      return NextResponse.json({ error: "contactId and role are required" }, { status: 400 });
    }

    const ds = await getDataService();
    await ds.addRelatedContact(id, contactId, role);

    revalidatePath(`/person/${id}`);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
