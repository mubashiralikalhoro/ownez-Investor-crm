import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchProspectLostDeadReasonField } from "@/lib/zoho/fields";
import { withCache } from "@/lib/redis";

type LostReasonOption = { display_value: string; actual_value: string };

/**
 * GET /api/prospects/lost-reasons
 *
 * Returns the live `Lost_Dead_Reason` picklist values from the Zoho Prospect
 * module so the UI dropdown stays in sync without code changes. Cached for
 * 60 minutes (picklist rarely changes).
 */
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const data = await withCache("lost-reasons:v1", async () => {
      const field = await fetchProspectLostDeadReasonField(session.accessToken);
      if (!field) return [];
      return field.picklist.map<LostReasonOption>(v => ({
        display_value: v.display_value,
        actual_value:  v.actual_value,
      }));
    }) as LostReasonOption[];

    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch lost reasons.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
