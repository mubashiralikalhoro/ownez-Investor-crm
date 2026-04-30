"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, AlertTriangle } from "lucide-react";
import { formatDate, formatRelativeDate } from "@/lib/format";
import { NEXT_ACTION_TYPES } from "@/lib/constants";
import { DateQuickPick } from "@/components/ui/date-quick-pick";
import type { ZohoProspectDetail } from "@/types";
import { makeRequest } from "./utils";
import { useLostReasons } from "./use-lost-reasons";

// ─── 3. Next Action Bar ───────────────────────────────────────────────────────

export type NextActionMode = "view" | "edit" | "drop";
export type DropTarget = "dead" | "nurture" | null;

export function sixMonthsOutCT(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split("T")[0];
}

export function ProspectNextActionBar({
  prospect, onUpdate, onRefresh,
}: {
  prospect: ZohoProspectDetail;
  onUpdate: (fields: Record<string, unknown>) => Promise<void>;
  onRefresh?: () => void | Promise<void>;
}) {
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = prospect.Next_Action_Date != null && prospect.Next_Action_Date < today;
  const isStale = (prospect.Days_Since_Last_Touch ?? 0) > 14;
  const isUrgent = isOverdue || isStale;
  const hasAction = !!prospect.Next_Action;

  const [mode,       setMode]       = useState<NextActionMode>("view");
  const [openCommitId, setOpenCommitId] = useState<string | null>(null);
  const [commitLoaded, setCommitLoaded] = useState(false);

  // Lazy-load Zoho Lost_Dead_Reason picklist when the drop form opens.
  const lostReasons = useLostReasons(mode === "drop");

  // Edit / Reschedule form
  const [actionType, setActionType] = useState("Follow-up");
  const [detail,     setDetail]     = useState("");
  const [date,       setDate]       = useState("");

  // Drop form
  const [dropTarget,   setDropTarget]   = useState<DropTarget>(null);
  const [lostReason,   setLostReason]   = useState<string | null>(null);
  const [reengageDate, setReengageDate] = useState<string>(() => sixMonthsOutCT());
  const [reasonNote,   setReasonNote]   = useState("");

  const [busy,  setBusy]  = useState<null | "done" | "edit" | "drop">(null);
  const [error, setError] = useState<string | null>(null);

  // Outstanding panel staged selection — user picks D/P/R, then Confirm applies.
  type ResolutionChoice = "done" | "pending" | "replace";
  const [selectedAction, setSelectedAction] = useState<ResolutionChoice | null>(null);

  // Fetch the current open commitment id so Mark Done / Cancel can target it.
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const res = await makeRequest(`/api/prospects/${prospect.id}/commitments`);
        if (!res.ok) { if (!abort) setCommitLoaded(true); return; }
        const { data } = await res.json() as { data?: Array<{ id: string }> };
        if (abort) return;
        setOpenCommitId(data?.[0]?.id ?? null);
      } catch {
        /* non-fatal */
      } finally {
        if (!abort) setCommitLoaded(true);
      }
    })();
    return () => { abort = true; };
  }, [prospect.id, prospect.Next_Action, prospect.Next_Action_Date]);

  function startEdit() {
    setActionType("Follow-up");
    setDetail("");
    setDate(prospect.Next_Action_Date ?? "");
    setError(null);
    setMode("edit");
  }

  function startDrop() {
    setDropTarget(null);
    setLostReason(null);
    setReengageDate(sixMonthsOutCT());
    setReasonNote("");
    setError(null);
    setMode("drop");
  }

  async function supersedeOpenCommitments(): Promise<void> {
    const openRes = await makeRequest(`/api/prospects/${prospect.id}/commitments`);
    if (!openRes.ok) return;
    const { data } = await openRes.json() as { data: Array<{ id: string }> };
    await Promise.all(
      (data ?? []).map(c =>
        makeRequest(`/api/prospects/${prospect.id}/commitments/${c.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ status: "superseded" }),
        })
      )
    );
  }

  async function handleSaveReschedule() {
    const effectiveDetail = detail.trim() || prospect.Next_Action || "";
    if (!effectiveDetail || !date) { setError("Detail and date are required."); return; }
    setBusy("edit");
    setError(null);
    try {
      await supersedeOpenCommitments();
      const createRes = await makeRequest(`/api/prospects/${prospect.id}/commitments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: actionType, detail: effectiveDetail, dueDate: date }),
      });
      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to save next action.");
      }
      await onUpdate({ Next_Action: effectiveDetail, Next_Action_Date: date });
      setOpenCommitId(null);
      setMode("view");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setBusy(null);
    }
  }

  async function handleMarkDone() {
    if (busy) return;
    setBusy("done");
    setError(null);
    try {
      if (openCommitId) {
        const res = await makeRequest(
          `/api/prospects/${prospect.id}/commitments/${openCommitId}`,
          {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ status: "fulfilled" }),
          },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? "Failed to mark done.");
        }
      }
      await onUpdate({ Next_Action: null, Next_Action_Date: null });
      setOpenCommitId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mark done.");
    } finally {
      setBusy(null);
    }
  }

  // "Still pending" is a true no-op (honest-red invariant): leave the open
  // commitment alone. Visual acknowledgement only.
  const [pendingAck, setPendingAck] = useState(false);
  function handleMarkPending() {
    if (busy) return;
    setPendingAck(true);
    setTimeout(() => setPendingAck(false), 1500);
  }

  async function handleDropConfirm() {
    if (busy) return;
    if (dropTarget === "dead" && !lostReason) {
      setError("Pick a reason first.");
      return;
    }
    if (dropTarget === "nurture" && !reengageDate) {
      setError("Pick a re-engage date.");
      return;
    }
    if (!dropTarget) return;
    setBusy("drop");
    setError(null);
    try {
      // 1. Cancel open commitments.
      await Promise.all(
        (openCommitId ? [openCommitId] : []).map(cid =>
          makeRequest(`/api/prospects/${prospect.id}/commitments/${cid}`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ status: "cancelled" }),
          }),
        ),
      );

      // 2. Log stage-change touch.
      const reasonValue = lostReason ?? "";
      const reasonLabel =
        lostReasons.options.find(o => o.actual_value === reasonValue)?.display_value ?? reasonValue;
      const stageNoteText = dropTarget === "dead"
        ? `Stage changed to Dead/Lost. Reason: ${reasonLabel}.`
        : `Stage changed to Nurture. Re-engage: ${reengageDate}.`;
      await makeRequest(`/api/prospects/${prospect.id}/activities`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: "stage_change", description: stageNoteText }),
      });

      // 2a. Persist user-typed reason note as separate Note record.
      const trimmedReasonNote = reasonNote.trim();
      if (dropTarget === "dead" && trimmedReasonNote) {
        await makeRequest(`/api/prospects/${prospect.id}/notes`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ content: trimmedReasonNote }),
        });
      }

      // 3. Update prospect stage + fields.
      const fields: Record<string, unknown> = {
        Pipeline_Stage:    dropTarget === "dead" ? "Dead / Lost" : "Nurture",
        Next_Action:       null,
        Next_Action_Date:  dropTarget === "nurture" ? reengageDate : null,
      };
      if (dropTarget === "dead") fields.Lost_Dead_Reason = reasonValue;
      await onUpdate(fields);
      setOpenCommitId(null);
      setMode("view");
      await onRefresh?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to end lead.");
    } finally {
      setBusy(null);
    }
  }

  // ── Edit / Reschedule form ────────────────────────────────────────────────
  if (mode === "edit") {
    return (
      <div className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-3 space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-gold">
          {hasAction ? "Reschedule / Replace Next Action" : "Set Next Action"}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={actionType}
            onChange={e => setActionType(e.target.value)}
            className="rounded-md border bg-card px-2 py-1.5 text-xs"
          >
            {NEXT_ACTION_TYPES.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <input
            value={detail}
            onChange={e => setDetail(e.target.value)}
            placeholder={prospect.Next_Action || "What needs to happen?"}
            className="flex-1 min-w-[200px] rounded-md border bg-card px-2.5 py-1.5 text-xs focus:outline-none focus:border-gold"
            onKeyDown={e => { if (e.key === "Enter") handleSaveReschedule(); if (e.key === "Escape") setMode("view"); }}
            autoFocus
          />
        </div>
        <DateQuickPick value={date} onChange={setDate} />
        {error && <p className="text-xs text-alert-red">{error}</p>}
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => { setMode("view"); setError(null); }} className="text-xs text-muted-foreground hover:text-navy">
            Cancel
          </button>
          <button
            onClick={handleSaveReschedule}
            disabled={busy === "edit"}
            className="rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-navy hover:bg-gold-hover disabled:opacity-50"
          >
            {busy === "edit" ? "Saving..." : hasAction ? "Save & Replace" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  // ── End / Drop Lead form (DropLeadPanel-style) ────────────────────────────
  if (mode === "drop") {
    return (
      <div
        role="group"
        aria-label={`Drop lead: ${prospect.Name}`}
        className="rounded-lg border border-muted-foreground/20 bg-muted/40 p-4 space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-navy">Drop lead</p>
            <p className="text-xs text-muted-foreground">
              Move {prospect.Name} out of active pipeline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setMode("view"); setError(null); }}
            className="text-xs text-muted-foreground hover:text-navy"
          >
            Cancel
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={dropTarget === "dead"}
            onClick={() => { setDropTarget("dead"); setError(null); }}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              dropTarget === "dead" ? "bg-gold text-navy" : "bg-card text-navy hover:bg-gold/20"
            }`}
          >
            <span className="font-semibold">[D]</span> Dead
          </button>
          <button
            type="button"
            aria-pressed={dropTarget === "nurture"}
            onClick={() => { setDropTarget("nurture"); setError(null); }}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              dropTarget === "nurture" ? "bg-gold text-navy" : "bg-card text-navy hover:bg-gold/20"
            }`}
          >
            <span className="font-semibold">[N]</span> Nurture
          </button>
        </div>

        {dropTarget === "dead" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {lostReasons.loading && lostReasons.options.length === 0 ? (
                <Loader2 size={12} className="animate-spin text-muted-foreground" />
              ) : (
                lostReasons.options.map((r) => {
                  const active = lostReason === r.actual_value;
                  return (
                    <button
                      key={r.actual_value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setLostReason(r.actual_value)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "bg-gold text-navy"
                          : "bg-card text-muted-foreground hover:bg-gold/20 hover:text-navy"
                      }`}
                    >
                      {r.display_value}
                    </button>
                  );
                })
              )}
              {lostReasons.fellBack && (
                <span className="text-[10px] text-muted-foreground/70 italic">(offline reasons)</span>
              )}
            </div>
            <input
              type="text"
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              placeholder="Optional note (what did they say?)"
              className="w-full rounded-md border bg-card px-2.5 py-1.5 text-xs placeholder:text-muted-foreground/50"
            />
          </div>
        )}

        {dropTarget === "nurture" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Re-engage on:</p>
            <DateQuickPick value={reengageDate} onChange={setReengageDate} />
          </div>
        )}

        {error && <p role="alert" className="text-xs font-medium text-alert-red">{error}</p>}

        {dropTarget !== null && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleDropConfirm}
              disabled={
                busy === "drop" ||
                (dropTarget === "dead" && !lostReason) ||
                (dropTarget === "nurture" && !reengageDate)
              }
              className="rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-navy hover:bg-gold-hover disabled:opacity-50"
            >
              {busy === "drop" ? <Loader2 size={11} className="animate-spin inline" /> : "Confirm"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── View ──────────────────────────────────────────────────────────────────
  // Outstanding = commitment past-due or due today (reference §6.4.2).
  // Only the outstanding case shows the CloseOutPrompt-style (Done/Pending/
  // Replace) panel. Every other state keeps the simple "click to edit" bar.
  const dueToday = prospect.Next_Action_Date === today;
  const outstanding = hasAction && (isOverdue || dueToday);

  if (outstanding) {
    const overdueDays = (() => {
      if (!prospect.Next_Action_Date) return 0;
      const due = new Date(prospect.Next_Action_Date + "T00:00:00").getTime();
      const now = new Date(today + "T00:00:00").getTime();
      return Math.max(0, Math.round((now - due) / 86400000));
    })();
    const actionLabel = prospect.Next_Action ?? "Next Action";

    async function handleConfirmResolution() {
      if (!selectedAction || busy) return;
      if (selectedAction === "done") {
        await handleMarkDone();
        setSelectedAction(null);
      } else if (selectedAction === "pending") {
        handleMarkPending();
        setSelectedAction(null);
      } else if (selectedAction === "replace") {
        setSelectedAction(null);
        startEdit();
      }
    }

    const chipMeta: { key: ResolutionChoice; hotkey: "D" | "P" | "R"; title: string; desc: string }[] = [
      { key: "done",    hotkey: "D", title: "Done",          desc: "activity handled it" },
      { key: "pending", hotkey: "P", title: "Still pending", desc: "stays open" },
      { key: "replace", hotkey: "R", title: "Replace",       desc: "set a new one" },
    ];

    return (
      <div
        role="group"
        aria-label="Next action — outstanding"
        className="rounded-lg p-4 space-y-3 border border-alert-red/30 bg-alert-red/5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-alert-red" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wider text-alert-red">
              Outstanding
            </p>
          </div>
          <button
            type="button"
            onClick={startDrop}
            disabled={!!busy}
            className="text-[11px] text-muted-foreground hover:text-navy hover:underline shrink-0"
          >
            Drop lead ▸
          </button>
        </div>

        <p className="text-sm text-navy">
          <span className="font-medium">{actionLabel}</span>
          {prospect.Next_Action_Date && (
            <>
              <span className="text-muted-foreground">
                {" "}— due {formatDate(prospect.Next_Action_Date)}
              </span>
              {overdueDays > 0 && (
                <span className="font-semibold text-alert-red"> ({overdueDays}d overdue)</span>
              )}
            </>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          {chipMeta.map((m) => {
            const active = selectedAction === m.key;
            return (
              <button
                key={m.key}
                type="button"
                aria-pressed={active}
                onClick={() => { setSelectedAction(m.key); setError(null); }}
                disabled={(m.key === "done" && !commitLoaded) || !!busy}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                  active
                    ? "bg-gold text-navy"
                    : "bg-muted text-muted-foreground hover:bg-gold/20 hover:text-navy"
                }`}
              >
                <span className="font-semibold">[{m.hotkey}]</span> {m.title}
                <span className="ml-1 font-normal opacity-70">— {m.desc}</span>
              </button>
            );
          })}
        </div>

        {selectedAction && (
          <div className="flex items-center justify-end gap-2 border-t border-alert-red/10 pt-2">
            <button
              type="button"
              onClick={() => { setSelectedAction(null); setError(null); }}
              disabled={!!busy}
              className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-navy disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmResolution}
              disabled={!!busy}
              className="rounded-full bg-gold px-4 py-1.5 text-xs font-medium text-navy hover:bg-gold-hover disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {busy === "done" && <Loader2 size={11} className="animate-spin" />}
              Confirm
            </button>
          </div>
        )}

        {error && <p role="alert" className="text-xs font-medium text-alert-red">{error}</p>}
      </div>
    );
  }

  // Non-outstanding: previous simple design. Click the bar to edit.
  return (
    <div className="space-y-0">
      {hasAction && isStale && (
        <div className="rounded-t-lg bg-alert-red/8 border border-b-0 border-alert-red/15 px-3 py-1 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-alert-red shrink-0" />
          <span className="text-[11px] font-medium text-alert-red">
            Stale — {prospect.Days_Since_Last_Touch}d idle
          </span>
        </div>
      )}
      <div
        className={`${
          hasAction && isStale
            ? "rounded-b-lg border border-t-0 border-alert-red/15"
            : "rounded-lg border border-gold/15"
        } bg-gold/5 px-3 py-2 cursor-pointer hover:bg-gold/10 transition-colors`}
        onClick={startEdit}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gold">Next Action</p>
            {hasAction ? (
              <p className="text-sm font-semibold text-navy line-clamp-1">{prospect.Next_Action}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not set — click to add</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {!isStale && prospect.Next_Action_Date && (
              <span className="text-xs font-medium text-navy">
                {formatRelativeDate(prospect.Next_Action_Date)}
              </span>
            )}
            <Pencil size={12} className="text-muted-foreground/40" />
          </div>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-alert-red">{error}</p>}
    </div>
  );
}
