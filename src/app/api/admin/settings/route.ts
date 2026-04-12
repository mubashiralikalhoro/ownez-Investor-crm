import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAppSettings, updateAppSettings } from "@/services/app-settings";

/**
 * GET /api/admin/settings
 * Returns the singleton app settings row (creates it with defaults if missing).
 */
export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!session.permissions.canAccessAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  try {
    const data = await getAppSettings();
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings
 * Body: { companyName?: string, fundTarget?: number }
 */
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!session.permissions.canAccessAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { companyName?: string; fundTarget?: number };
  try {
    body = (await request.json()) as { companyName?: string; fundTarget?: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const data = await updateAppSettings({
      companyName: body.companyName,
      fundTarget:  body.fundTarget,
    });
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
