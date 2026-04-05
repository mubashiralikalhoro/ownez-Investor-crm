import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProspectsList, createProspectInZoho } from "@/services/prospects";
import type { CreateProspectInput } from "@/services/prospects";

/**
 * GET /api/prospects
 * Query params: page, page_size, search, stage, source, owner_id
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const page          = Math.max(1, parseInt(searchParams.get("page")       ?? "1",   10));
  const pageSize      = Math.min(200, Math.max(1, parseInt(searchParams.get("page_size") ?? "200", 10)));
  const search        = searchParams.get("search")        ?? undefined;
  const stage         = searchParams.get("stage")         ?? undefined;
  const source        = searchParams.get("source")        ?? undefined;
  const ownerId       = searchParams.get("owner_id")      ?? undefined;
  const excludeFunded = searchParams.get("exclude_funded") === "true";

  try {
    const result = await getProspectsList(session.accessToken, page, pageSize, {
      search,
      pipelineStage: stage,
      leadSource:    source,
      ownerId,
      excludeFunded,
    });
    return NextResponse.json({ data: result.data, info: result.info });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch prospects.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/prospects
 *
 * Creates a new Prospect record in Zoho CRM.
 *
 * Required body fields:
 *   name          string   Full name of the prospect
 *   leadSourceKey string   Internal key e.g. "cpa_referral"
 *
 * Optional body fields:
 *   email          string
 *   phone          string
 *   nextAction     string
 *   nextActionDate string   "YYYY-MM-DD"
 *   ownerZohoId    string   Zoho CRM user ID
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name         = (body.name as string | undefined)?.trim();
  const leadSourceKey = (body.leadSourceKey as string | undefined)?.trim();

  if (!name)         return NextResponse.json({ error: "name is required." },          { status: 422 });
  if (!leadSourceKey) return NextResponse.json({ error: "leadSourceKey is required." }, { status: 422 });

  const input: CreateProspectInput = {
    name,
    leadSourceKey,
    email:          (body.email          as string | undefined) || null,
    phone:          (body.phone          as string | undefined) || null,
    nextAction:     (body.nextAction     as string | undefined) || null,
    nextActionDate: (body.nextActionDate as string | undefined) || null,
    ownerZohoId:    (body.ownerZohoId    as string | undefined) || null,
  };

  try {
    const result = await createProspectInZoho(session.accessToken, input);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create prospect.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
