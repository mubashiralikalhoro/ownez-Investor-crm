import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { ZOHO_CRM_BASE_URL } from "@/lib/constants";

/**
 * GET /api/prospects/[id]/attachments/[attachmentId]
 * Proxies the Zoho attachment download so the access token stays server-side.
 * Zoho endpoint: GET /crm/v8/Prospect/{record_id}/Attachments/{attachment_id}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const authHeader = request.headers.get("authorization") ?? "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!accessToken) return NextResponse.json({ error: "Missing access token." }, { status: 400 });

  const { id, attachmentId } = await params;

  const zohoUrl = `${ZOHO_CRM_BASE_URL}/Prospect/${id}/Attachments/${attachmentId}`;

  let upstream: Response;
  try {
    upstream = await fetch(zohoUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      redirect: "follow",
    });
  } catch (err) {
    console.error("[attachment-download] fetch error:", err);
    return NextResponse.json({ error: "Network error reaching Zoho." }, { status: 502 });
  }

  if (!upstream.ok) {
    // Surface the actual Zoho error body for debugging
    const errBody = await upstream.text().catch(() => "");
    console.error(`[attachment-download] Zoho ${upstream.status}:`, errBody);
    return NextResponse.json(
      { error: `Zoho returned ${upstream.status}`, detail: errBody },
      { status: upstream.status }
    );
  }

  // Read the full body as an ArrayBuffer so we can safely forward it
  const buffer = await upstream.arrayBuffer();

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  // Use the file name from Zoho's header, or fall back to the attachment ID
  const rawDisposition = upstream.headers.get("content-disposition");
  const contentDisposition = rawDisposition ?? `attachment; filename="${attachmentId}"`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition,
      "Content-Length": String(buffer.byteLength),
    },
  });
}
