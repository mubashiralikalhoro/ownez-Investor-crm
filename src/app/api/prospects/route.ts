import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProspectsList } from "@/services/prospects";
import type { ProspectFilters } from "@/types";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const accessToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Missing Zoho access token in Authorization: Bearer <token> header." },
      { status: 400 }
    );
  }

  const sp = request.nextUrl.searchParams;

  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const pageSize = Math.min(200, Math.max(1, Number(sp.get("page_size") ?? "200")));

  const filters: ProspectFilters = {
    search: sp.get("search") ?? undefined,
    pipelineStage: sp.get("stage") ?? undefined,
    leadSource: sp.get("source") ?? undefined,
    ownerId: sp.get("owner_id") ?? undefined,
  };

  // Strip undefined values so the service receives clean input.
  Object.keys(filters).forEach(
    (k) => filters[k as keyof ProspectFilters] === undefined && delete filters[k as keyof ProspectFilters]
  );

  try {
    const result = await getProspectsList(accessToken, page, pageSize, filters);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch prospects.";
    const status = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
