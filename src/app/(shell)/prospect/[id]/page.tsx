"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { ProspectDetailSkeleton } from "@/components/prospect/prospect-skeleton";
import { ProspectQuickLog } from "@/components/prospect/prospect-quick-log";
import type {
  ZohoProspectDetail, ZohoNote, ZohoStageHistory, ZohoAttachment,
  ZohoTask, ZohoFundedRecord,
} from "@/types";
import { SetLastViewed } from "@/components/set-last-viewed";
import { ZOHO_TO_STAGE } from "@/lib/zoho-map";
import { getCurrentUserRef, makeRequest } from "./_components/utils";
import { ProspectIdentityBar } from "./_components/prospect-identity-bar";
import { ProspectNextActionBar } from "./_components/prospect-next-action";
import { ProspectProfileCard } from "./_components/prospect-profile-card";
import { ProspectActivityTimeline } from "./_components/prospect-activity-timeline";
import { ProspectNotesSection } from "./_components/prospect-notes-section";
import { ProspectRecordInfo } from "./_components/prospect-record-info";
import { ProspectStageHistorySection } from "./_components/prospect-stage-history";
import { ProspectTasksSection } from "./_components/prospect-tasks";
import { ProspectAttachmentsSection } from "./_components/prospect-attachments";
import { ProspectFundedSection } from "./_components/prospect-funded";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProspectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id;

  const fromParam = searchParams.get("from");
  // `from=prospect:<id>` → back to that prospect (used when navigating
  // between prospects via Referrer / Related Contact links).
  const prospectBackId = fromParam?.startsWith("prospect:")
    ? fromParam.slice("prospect:".length)
    : null;
  const backNav: { label: string; href: string } =
    prospectBackId                 ? { label: "Prospect",   href: `/prospect/${prospectBackId}` }
    : fromParam === "dashboard"    ? { label: "Dashboard",  href: "/" }
    : fromParam === "people"       ? { label: "People",     href: "/people" }
    : fromParam === "leadership"   ? { label: "Leadership", href: "/leadership" }
    :                                { label: "Pipeline",   href: "/pipeline" };

  const [prospect,     setProspect]     = useState<ZohoProspectDetail | null>(null);
  const [notes,        setNotes]        = useState<ZohoNote[]>([]);
  const [stageHistory, setStageHistory] = useState<ZohoStageHistory[]>([]);
  const [attachments,  setAttachments]  = useState<ZohoAttachment[]>([]);
  const [tasks,        setTasks]        = useState<ZohoTask[]>([]);
  const [funded,       setFunded]       = useState<ZohoFundedRecord[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  const fetchAll = useCallback(async (isRetry = false) => {
    setLoading(true); setError(null);

    try {
      const [detailRes, notesRes, stageHistRes, attachRes, tasksRes, fundedRes] =
        await Promise.all([
          fetch(`/api/prospects/${id}`,               { credentials: "same-origin" }),
          fetch(`/api/prospects/${id}/notes`,         { credentials: "same-origin" }),
          fetch(`/api/prospects/${id}/stage-history`, { credentials: "same-origin" }),
          fetch(`/api/prospects/${id}/attachments`,   { credentials: "same-origin" }),
          fetch(`/api/prospects/${id}/tasks`,         { credentials: "same-origin" }),
          fetch(`/api/prospects/${id}/funded`,        { credentials: "same-origin" }),
        ]);

      if (detailRes.status === 401 && !isRetry) {
        const ok = (await fetch("/api/auth/zoho/refresh", { method: "POST", credentials: "same-origin" })).ok;
        if (ok) return fetchAll(true);
        router.replace(`/login?next=/prospect/${id}`);
        return;
      }
      if (!detailRes.ok) {
        const body = (await detailRes.json()) as { error?: string };
        setError(body.error ?? "Failed to load prospect.");
        return;
      }

      const safe = async <T,>(res: Response, fallback: T): Promise<T> =>
        res.ok ? ((await res.json()) as { data: T }).data : fallback;

      const [detailData, notesData, stageHistData, attachData, tasksData, fundedData] =
        await Promise.all([
          (detailRes.json() as Promise<{ data: ZohoProspectDetail }>).then(j => j.data),
          safe<ZohoNote[]>(notesRes, []),
          safe<ZohoStageHistory[]>(stageHistRes, []),
          safe<ZohoAttachment[]>(attachRes, []),
          safe<ZohoTask[]>(tasksRes, []),
          safe<ZohoFundedRecord[]>(fundedRes, []),
        ]);

      setProspect(detailData);
      setNotes(notesData);
      setStageHistory(stageHistData);
      setAttachments(attachData);
      setTasks(tasksData);
      setFunded(fundedData);
    } catch {
      setError("Network error — could not load prospect.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // ── Mutation callbacks ────────────────────────────────────────────────────

  const updateProspect = useCallback(async (fields: Record<string, unknown>) => {
    const res = await makeRequest(`/api/prospects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Failed to update.");
    }
    setProspect(prev => prev ? { ...prev, ...fields } as ZohoProspectDetail : prev);
  }, [id]);

  const addNote = useCallback(async (title: string, content: string) => {
    const res = await makeRequest(`/api/prospects/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Failed to create note.");
    }
    const json = await res.json() as { data: ZohoNote };
    const currentUser = getCurrentUserRef();
    const note: ZohoNote = {
      ...json.data,
      Created_By: currentUser ?? json.data.Created_By,
    };
    setNotes(prev => [note, ...prev]);
  }, [id]);

  const editNote = useCallback(async (noteId: string, title: string, content: string) => {
    const res = await makeRequest(`/api/prospects/${id}/notes/${noteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Failed to update note.");
    }
    setNotes(prev => prev.map(n =>
      n.id === noteId ? { ...n, Note_Title: title.trim() || null, Note_Content: content.trim() } : n
    ));
  }, [id]);

  const deleteNote = useCallback(async (noteId: string) => {
    const res = await makeRequest(`/api/prospects/${id}/notes/${noteId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Failed to delete note.");
    }
    setNotes(prev => prev.filter(n => n.id !== noteId));
  }, [id]);

  const uploadAttachment = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await makeRequest(`/api/prospects/${id}/attachments`, { method: "POST", body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Upload failed.");
    }
    const json = await res.json() as { data: ZohoAttachment };
    setAttachments(prev => [...prev, json.data]);
  }, [id]);

  const deleteAttachment = useCallback(async (attachmentId: string) => {
    const res = await makeRequest(`/api/prospects/${id}/attachments/${attachmentId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Failed to delete attachment.");
    }
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  }, [id]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return <ProspectDetailSkeleton backLabel={backNav.label} />;
  }

  if (error || !prospect) {
    return (
      <div className="w-full px-3 md:px-8 pt-8">
        <Link href="/pipeline" className="text-xs text-muted-foreground hover:text-gold transition-colors">&larr; Pipeline</Link>
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-alert-red/25 bg-alert-red-light px-4 py-3 text-sm text-alert-red max-w-md">
          <AlertCircle size={16} className="shrink-0" />{error ?? "Prospect not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden">
      <SetLastViewed
        id={prospect.id}
        fullName={prospect.Name}
        pipelineStage={ZOHO_TO_STAGE[prospect.Pipeline_Stage ?? ""] ?? null}
        organizationName={prospect.Company_Entity}
      />
      {/* Back link */}
      <div className="px-3 md:px-8 pt-3 md:pt-6">
        <Link href={backNav.href} className="text-xs text-muted-foreground hover:text-gold transition-colors">
          &larr; {backNav.label}
        </Link>
      </div>

      {/* Cockpit Zone — sticky */}
      <div className="sticky top-[33px] z-10 bg-background border-b px-3 md:px-8 py-3 md:py-4 space-y-2 md:space-y-3 overflow-hidden">
        <ProspectIdentityBar prospect={prospect} onUpdate={updateProspect} />
        {prospect.Pipeline_Stage !== "Funded" && (
          <ProspectNextActionBar prospect={prospect} onUpdate={updateProspect} onRefresh={fetchAll} />
        )}
        {prospect.Pipeline_Stage !== "Funded" && (
          <ProspectQuickLog
            prospectId={prospect.id}
            prospectName={prospect.Name ?? "prospect"}
            pipelineStage={
              prospect.Pipeline_Stage
                ? ZOHO_TO_STAGE[prospect.Pipeline_Stage] ?? null
                : null
            }
            nextActionType={null}
            nextActionDetail={prospect.Next_Action ?? null}
            nextActionDate={prospect.Next_Action_Date ?? null}
            onRefresh={fetchAll}
            onLocalSync={(fields) =>
              setProspect(prev =>
                prev ? ({ ...prev, ...fields } as ZohoProspectDetail) : prev,
              )
            }
          />
        )}
      </div>

      {/* Detail Zone */}
      <div className="px-3 md:px-8 py-4 md:py-6">
        <div className="flex flex-col lg:flex-row lg:gap-6">

          {/* Left column */}
          <div className="flex-1 min-w-0 space-y-3 lg:space-y-5">
            <ProspectProfileCard prospect={prospect} onUpdate={updateProspect} />
            <div className="rounded-lg border bg-card p-3 lg:border-0 lg:rounded-none lg:bg-transparent lg:p-0">
              <ProspectActivityTimeline prospectId={id} />
            </div>
            <div className="rounded-lg border bg-card p-3 lg:border-0 lg:rounded-none lg:bg-transparent lg:p-0">
              <ProspectStageHistorySection history={stageHistory} />
            </div>
          </div>

          {/* Right column */}
          <div className="lg:w-[300px] xl:w-[340px] lg:shrink-0 mt-3 lg:mt-0 space-y-3 lg:space-y-5">
            <div className="rounded-lg border bg-card p-3 lg:border-0 lg:rounded-none lg:bg-transparent lg:p-0">
              <ProspectNotesSection
                notes={notes}
                onAdd={addNote}
                onEdit={editNote}
                onDelete={deleteNote}
              />
            </div>
            <div className="rounded-lg border bg-card p-3 lg:border-0 lg:rounded-none lg:bg-transparent lg:p-0">
              <ProspectTasksSection tasks={tasks} />
            </div>
            <div className="rounded-lg border bg-card p-3 lg:border-0 lg:rounded-none lg:bg-transparent lg:p-0">
              <ProspectAttachmentsSection
                attachments={attachments}
                prospectId={id}
                onUpload={uploadAttachment}
                onDelete={deleteAttachment}
              />
            </div>
            <div className="rounded-lg border bg-card p-3 lg:border-0 lg:rounded-none lg:bg-transparent lg:p-0">
              <ProspectFundedSection funded={funded} />
            </div>
            <div className="rounded-lg border bg-card p-3 lg:border-0 lg:rounded-none lg:bg-transparent lg:p-0">
              <ProspectRecordInfo prospect={prospect} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
