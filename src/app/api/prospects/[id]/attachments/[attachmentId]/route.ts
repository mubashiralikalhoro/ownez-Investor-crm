import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { ZOHO_CRM_BASE_URL } from "@/lib/constants";
import { deleteProspectAttachmentFromZoho } from "@/services/prospects";

/**
 * GET /api/prospects/[id]/attachments/[attachmentId]
 * Proxies the Zoho attachment download so the access token stays server-side.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id, attachmentId } = await params;
  const zohoUrl = `${ZOHO_CRM_BASE_URL}/Prospect/${id}/Attachments/${attachmentId}`;

  let upstream: Response;
  try {
    upstream = await fetch(zohoUrl, {
      headers:  { Authorization: `Zoho-oauthtoken ${session.accessToken}` },
      redirect: "follow",
    });
  } catch (err) {
    console.error("[attachment-download] fetch error:", err);
    return NextResponse.json({ error: "Network error reaching Zoho." }, { status: 502 });
  }

  if (!upstream.ok) {
    const errBody = await upstream.text().catch(() => "");
    console.error(`[attachment-download] Zoho ${upstream.status}:`, errBody);
    return NextResponse.json(
      { error: `Zoho returned ${upstream.status}` },
      { status: upstream.status }
    );
  }

  const buffer          = await upstream.arrayBuffer();
  const contentType     = upstream.headers.get("content-type") ?? "application/octet-stream";
  const rawDisposition  = upstream.headers.get("content-disposition");
  const contentDisposition = rawDisposition ?? `attachment; filename="${attachmentId}"`;

  return new NextResponse(buffer, {
    status:  200,
    headers: {
      "Content-Type":        contentType,
      "Content-Disposition": contentDisposition,
      "Content-Length":      String(buffer.byteLength),
    },
  });
}

/**
 * DELETE /api/prospects/[id]/attachments/[attachmentId]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id, attachmentId } = await params;

  try {
    await deleteProspectAttachmentFromZoho(session.accessToken, id, attachmentId);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete attachment.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
