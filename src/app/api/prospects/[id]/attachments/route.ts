import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProspectAttachments } from "@/services/prospects";
import { ZOHO_CRM_BASE_URL } from "@/lib/constants";

// ─── File upload validation ───────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
]);

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

  try {
    const data = await getProspectAttachments(session.accessToken, id);
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch attachments.";
    const status  = message.includes("(401)") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/prospects/[id]/attachments
 * Accepts multipart/form-data with a "file" field.
 * Validates file size (max 10 MB) and MIME type before proxying to Zoho.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No file provided." }, { status: 422 });
  }

  // ── Validate MIME type ────────────────────────────────────────────────────
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: `File type "${mimeType}" is not allowed. Accepted: PDF, Word, Excel, PowerPoint, images, plain text, CSV.` },
      { status: 422 }
    );
  }

  // ── Validate file size ────────────────────────────────────────────────────
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the 10 MB limit (got ${(file.size / 1024 / 1024).toFixed(1)} MB).` },
      { status: 413 }
    );
  }

  // ── Proxy to Zoho ─────────────────────────────────────────────────────────
  const zohoForm = new FormData();
  zohoForm.append("file", file, file instanceof File ? file.name : "attachment");

  let zohoRes: Response;
  try {
    zohoRes = await fetch(`${ZOHO_CRM_BASE_URL}/Prospect/${id}/Attachments`, {
      method:  "POST",
      headers: { Authorization: `Zoho-oauthtoken ${session.accessToken}` },
      body:    zohoForm,
    });
  } catch (err) {
    console.error("[attachment-upload] network error:", err);
    return NextResponse.json({ error: "Network error reaching Zoho." }, { status: 502 });
  }

  if (!zohoRes.ok) {
    const errText = await zohoRes.text().catch(() => "");
    console.error(`[attachment-upload] Zoho ${zohoRes.status}:`, errText);
    return NextResponse.json(
      { error: `Zoho upload failed (${zohoRes.status})` },
      { status: zohoRes.status }
    );
  }

  type ZohoUploadResponse = {
    data?: Array<{
      code:     string;
      status:   string;
      details?: { id?: string; File_Name?: string; Size?: string };
    }>;
  };
  const zohoData = (await zohoRes.json()) as ZohoUploadResponse;
  const result   = zohoData.data?.[0];

  if (result?.status !== "success" || !result?.details?.id) {
    return NextResponse.json(
      { error: `Zoho upload error: [${result?.code ?? "UNKNOWN"}]` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: {
      id:           result.details.id,
      File_Name:    result.details.File_Name ?? (file instanceof File ? file.name : "attachment"),
      Size:         result.details.Size ?? null,
      Created_Time: new Date().toISOString(),
      Created_By:   null,
    },
  }, { status: 201 });
}
