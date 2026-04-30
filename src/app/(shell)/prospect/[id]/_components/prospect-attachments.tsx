"use client";

import { useRef, useState } from "react";
import {
  ChevronDown, ChevronRight, Paperclip, Loader2, Upload, Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import type { ZohoAttachment } from "@/types";

// ─── 10. Attachments with upload + delete ────────────────────────────────────

export function formatFileSize(sizeStr: string | null): string {
  if (!sizeStr) return "—";
  const bytes = parseInt(sizeStr, 10);
  if (isNaN(bytes) || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function fileExtension(name: string | null): string {
  if (!name) return "FILE";
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
}

export function ProspectAttachmentsSection({
  attachments, prospectId, onUpload, onDelete,
}: {
  attachments: ZohoAttachment[];
  prospectId: string;
  onUpload: (file: File) => Promise<void>;
  onDelete: (attachmentId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDownload = async (att: ZohoAttachment) => {
    setDownloading(att.id);
    const doFetch = () =>
      fetch(`/api/prospects/${prospectId}/attachments/${att.id}`, { credentials: "same-origin" });
    try {
      let res = await doFetch();
      if (res.status === 401) {
        const ok = (await fetch("/api/auth/zoho/refresh", { method: "POST", credentials: "same-origin" })).ok;
        if (!ok) { alert("Session expired. Please log in again."); return; }
        res = await doFetch();
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string; detail?: string };
        alert(`Download failed: ${body.error ?? res.statusText}${body.detail ? `\n${body.detail}` : ""}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = att.File_Name ?? att.id;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[download]", err); alert("Network error while downloading.");
    } finally {
      setDownloading(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setUploadError("File must be under 20 MB"); return; }
    setUploading(true); setUploadError(null);
    try {
      await onUpload(file);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (att: ZohoAttachment) => {
    if (!window.confirm(`Delete "${att.File_Name ?? "this file"}"? This cannot be undone.`)) return;
    try { await onDelete(att.id); }
    catch (e) { alert(e instanceof Error ? e.message : "Failed to delete attachment"); }
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 flex-1 text-left group">
          {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
          <Paperclip size={14} className="text-muted-foreground shrink-0" />
          <h3 className="text-sm font-semibold text-navy">Attachments</h3>
          <span className="ml-1 text-[10px] text-muted-foreground">{attachments.length}</span>
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-gold hover:text-gold/80 disabled:opacity-50 transition-colors"
        >
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      {uploadError && <p className="mt-1 pl-5 text-[10px] text-alert-red">{uploadError}</p>}

      {expanded && (
        <div className="mt-3 pl-5 space-y-2">
          {attachments.length === 0 && !uploading && (
            <p className="text-sm text-muted-foreground italic">No attachments.</p>
          )}
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5 group/att">
              <div className="shrink-0 w-8 h-8 rounded bg-muted flex items-center justify-center">
                <span className="text-[8px] font-bold text-muted-foreground">{fileExtension(att.File_Name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-navy truncate">{att.File_Name ?? "Unnamed file"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatFileSize(att.Size)} · {att.Created_By?.name ?? "—"} · {att.Created_Time ? formatDate(att.Created_Time) : "—"}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleDownload(att)}
                  disabled={downloading === att.id}
                  className="flex items-center gap-1 text-[10px] font-medium text-navy hover:text-gold transition-colors disabled:opacity-50 border border-border rounded px-2 py-1"
                  title="Download"
                >
                  {downloading === att.id ? <Loader2 size={10} className="animate-spin" /> : <Paperclip size={10} />}
                  {downloading === att.id ? "…" : "Download"}
                </button>
                <button
                  onClick={() => handleDelete(att)}
                  className="p-1 rounded text-muted-foreground hover:text-alert-red hover:bg-alert-red/10 transition-colors opacity-0 group-hover/att:opacity-100"
                  title="Delete attachment"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
