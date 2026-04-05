"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { detectActivityType, detectOutcome, hasOutcome } from "@/lib/smart-detection";
import { ACTIVITY_TYPES, NEXT_ACTION_TYPES, STAGE_LABELS } from "@/lib/constants";
import { getTodayCT, formatRelativeDate, formatCurrency, formatDate, formatTime } from "@/lib/format";
import { DateQuickPick } from "@/components/ui/date-quick-pick";
import { CreateProspectSheet } from "./create-prospect-sheet";
import { demoData } from "@/data/store";
import type { PersonWithComputed, Activity, PipelineStage, NextActionType } from "@/lib/types";

const DEMO_USER = "u-chad";

interface DashboardHeaderProps {
  prospects: PersonWithComputed[];
}

export function DashboardHeader({ prospects }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 gap-3">
      <h1 className="text-lg md:text-xl font-semibold text-navy shrink-0">Dashboard</h1>
      <div className="flex items-center gap-2 md:gap-3">
        <CreateProspectSheet />
        <LogActivitySheet prospects={prospects} />
      </div>
    </div>
  );
}

function LogActivitySheet({ prospects }: { prospects: PersonWithComputed[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<PersonWithComputed | null>(null);

  // Quick log state
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Timeline state
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  // Next action prompt state
  const [showPrompt, setShowPrompt] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [promptActionType, setPromptActionType] = useState<string>("follow_up");
  const [promptDetail, setPromptDetail] = useState("");
  const [promptDate, setPromptDate] = useState("");

  const detectedType = text ? detectActivityType(text) : "note";
  const detectedOutcome = text ? detectOutcome(text) : "connected";
  const typeConfig = ACTIVITY_TYPES.find((t) => t.key === detectedType);

  // Fetch activities when a person is selected
  useEffect(() => {
    if (!selectedPerson) {
      setRecentActivities([]);
      return;
    }
    demoData
      .getActivities(selectedPerson.id)
      .then((data) => setRecentActivities(data.slice(0, 5)))
      .catch(() => setRecentActivities([]));
  }, [selectedPerson]);

  const filtered = search
    ? prospects.filter(
        (p) =>
          p.fullName.toLowerCase().includes(search.toLowerCase()) ||
          (p.organizationName?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : prospects.slice(0, 8);

  function handleSelectPerson(person: PersonWithComputed) {
    setSelectedPerson(person);
    setSearch("");
  }

  function resetState() {
    setSearch("");
    setSelectedPerson(null);
    setText("");
    setSubmitting(false);
    setShowPrompt(false);
    setShowSuccess(false);
    setConfirming(false);
    setRecentActivities([]);
  }

  async function handleSubmit() {
    if (!text.trim() || !selectedPerson) return;
    setSubmitting(true);

    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Chicago",
      });

      await demoData.createActivity(selectedPerson.id, {
        activityType: detectedType,
        source: "manual",
        date: getTodayCT(),
        time: currentTime,
        outcome: hasOutcome(detectedType) ? detectedOutcome : "connected",
        detail: text,
        documentsAttached: [],
        loggedById: DEMO_USER,
        annotation: null,
      });

      setText("");
      // Set prompt state — detail starts empty, old value shown as gray placeholder
      setPromptActionType(selectedPerson.nextActionType ?? "follow_up");
      setPromptDetail("");
      setPromptDate(selectedPerson.nextActionDate ?? "");
      setShowPrompt(true);
      setShowSuccess(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePromptConfirm() {
    if (!selectedPerson) return;
    setConfirming(true);
    await demoData.updatePerson(selectedPerson.id, {
      nextActionType: promptActionType as NextActionType,
      nextActionDetail: promptDetail.trim() || selectedPerson.nextActionDetail || "",
      nextActionDate: promptDate,
    });
    setConfirming(false);
    setShowPrompt(false);
    setShowSuccess(true);
  }

  async function handleAdvanceStage() {
    if (!selectedPerson) return;
    const stages = ["prospect", "initial_contact", "discovery", "pitch", "active_engagement", "soft_commit", "commitment_processing", "kyc_docs", "funded"];
    const currentIdx = stages.indexOf(selectedPerson.pipelineStage ?? "");
    if (currentIdx >= 0 && currentIdx < stages.length - 1) {
      const nextStage = stages[currentIdx + 1];
      if (confirm(`Advance ${selectedPerson.fullName} to ${nextStage.replace(/_/g, " ")}?`)) {
        const p = await demoData.getPerson(selectedPerson.id);
        if (!p) return;
        const oldStage = p.pipelineStage;
        const today = getTodayCT();
        const timeStr = new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Chicago",
        });
        await demoData.updatePerson(selectedPerson.id, {
          pipelineStage: nextStage as PipelineStage,
          stageChangedDate: today,
        });
        const oldLabel = oldStage ? STAGE_LABELS[oldStage] : "None";
        const newLabel = STAGE_LABELS[nextStage as PipelineStage] || nextStage;
        await demoData.createActivity(selectedPerson.id, {
          activityType: "stage_change",
          source: "manual",
          date: today,
          time: timeStr,
          outcome: "connected",
          detail: `Stage updated from ${oldLabel} to ${newLabel}`,
          documentsAttached: [],
          loggedById: DEMO_USER,
          annotation: null,
        });
      }
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetState();
      }}
    >
      <SheetTrigger
        className="inline-flex items-center gap-1 md:gap-1.5 rounded-full bg-gold px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-navy hover:bg-gold-hover transition-colors cursor-pointer"
      >
        <ClipboardList size={14} className="shrink-0" />
        <span className="hidden sm:inline">Log Activity</span>
        <span className="sm:hidden">Log</span>
      </SheetTrigger>
      <SheetContent side="right" className="p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Log Activity</SheetTitle>
          <SheetDescription>
            {selectedPerson
              ? `Logging for ${selectedPerson.fullName}`
              : "Search for a prospect to log an activity"}
          </SheetDescription>
        </SheetHeader>

        <div className="p-4">
          {!selectedPerson ? (
            /* Step 1: Search for prospect */
            <div className="space-y-3">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={16}
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or company..."
                  className="pl-9 h-10 text-sm"
                  autoFocus
                />
              </div>
              <div className="rounded-lg border bg-card overflow-hidden max-h-[60vh] overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    No prospects found
                  </p>
                ) : (
                  <div className="divide-y">
                    {filtered.map((person) => (
                      <button
                        key={person.id}
                        onClick={() => handleSelectPerson(person)}
                        className="flex items-center justify-between gap-2 w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-navy truncate block">
                            {person.fullName}
                          </span>
                          {person.organizationName && (
                            <p className="text-xs text-muted-foreground truncate">
                              {person.organizationName}
                            </p>
                          )}
                        </div>
                        {person.pipelineStage && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {STAGE_LABELS[person.pipelineStage]}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : showSuccess && selectedPerson ? (
            /* Step 3b: Success — prospect status summary */
            <div className="space-y-4 py-2">
              {/* Success header */}
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-healthy-green/10 flex items-center justify-center shrink-0">
                  <Check size={16} className="text-healthy-green" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy">{selectedPerson.fullName}</p>
                  <p className="text-xs text-healthy-green font-medium">Activity logged &amp; next action set</p>
                </div>
              </div>

              {/* Status card */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                {/* Stage + Amount row */}
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {selectedPerson.pipelineStage ? STAGE_LABELS[selectedPerson.pipelineStage] : "—"}
                  </Badge>
                  {selectedPerson.initialInvestmentTarget && (
                    <span className="text-sm font-semibold text-navy tabular-nums">
                      {formatCurrency(selectedPerson.initialInvestmentTarget)}
                    </span>
                  )}
                </div>

                {/* Next action summary */}
                <div className="border-t pt-3 space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Next action</p>
                  <p className="text-sm font-medium text-navy">
                    {NEXT_ACTION_TYPES.find((t) => t.key === promptActionType)?.label ?? "Follow Up"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {promptDetail.trim() || selectedPerson.nextActionDetail || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRelativeDate(promptDate)} {promptDate ? `· ${promptDate}` : ""}
                  </p>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2">
                <a
                  href={`/prospect/${selectedPerson.id}`}
                  className="flex-1 rounded-full border border-navy/20 py-2 text-center text-sm font-medium text-navy hover:bg-muted/50 transition-colors"
                >
                  Open profile
                </a>
                <button
                  onClick={() => { resetState(); setOpen(false); window.location.reload(); }}
                  className="flex-1 rounded-full bg-gold py-2 text-center text-sm font-semibold text-navy hover:bg-gold-hover transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : showPrompt ? (
            /* Step 3: Next action prompt */
            <div className="space-y-5">
              {/* Success banner */}
              <div className="rounded-lg bg-healthy-green/10 px-3 py-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-healthy-green shrink-0" />
                <p className="text-sm font-medium text-healthy-green">
                  Logged for {selectedPerson?.fullName}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-gold uppercase tracking-wider mb-3">
                  What&apos;s next?
                </p>

                {/* Action type — full width */}
                <select
                  value={promptActionType}
                  onChange={(e) => setPromptActionType(e.target.value)}
                  className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-medium text-navy mb-3"
                >
                  {NEXT_ACTION_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>

                {/* Detail — empty field, old value as gray placeholder */}
                <Input
                  value={promptDetail}
                  onChange={(e) => setPromptDetail(e.target.value)}
                  className="w-full text-sm h-11 bg-white placeholder:text-muted-foreground/40 placeholder:italic"
                  placeholder={selectedPerson?.nextActionDetail || "What needs to happen next?"}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePromptConfirm();
                  }}
                  autoFocus
                />
              </div>

              {/* Date quick picks — larger touch targets */}
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  When
                </p>
                <DateQuickPick value={promptDate} onChange={setPromptDate} />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleAdvanceStage}
                  className="rounded-full border border-gold/40 bg-gold/10 px-3 py-2 text-sm font-medium text-gold hover:bg-gold/20 transition-colors"
                >
                  Advance stage &rarr;
                </button>
                <button
                  onClick={handlePromptConfirm}
                  disabled={confirming}
                  className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-navy hover:bg-gold-hover disabled:opacity-50 transition-colors"
                >
                  {confirming ? "Saving..." : "Confirm"}
                </button>
              </div>
            </div>
          ) : (
            /* Step 2: Log the activity */
            <div className="space-y-3">
              <button
                onClick={() => setSelectedPerson(null)}
                className="text-xs text-muted-foreground hover:text-navy transition-colors"
              >
                &larr; Change prospect
              </button>
              <div className="flex items-center gap-2">
                {text && typeConfig && (
                  <Badge
                    variant="secondary"
                    className="text-xs text-white shrink-0"
                    style={{ backgroundColor: typeConfig.color }}
                  >
                    {typeConfig.label}
                  </Badge>
                )}
                {text && hasOutcome(detectedType) && detectedOutcome === "attempted" && (
                  <Badge
                    variant="outline"
                    className="text-xs text-alert-red border-alert-red/30 shrink-0"
                  >
                    Attempted
                  </Badge>
                )}
              </div>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`What happened with ${selectedPerson.fullName}?`}
                className="text-sm h-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={submitting}
                autoFocus
              />
              {text && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-navy hover:bg-gold-hover disabled:opacity-50"
                  >
                    {submitting ? "Logging..." : "Log Activity"}
                  </button>
                </div>
              )}

              {/* Compact recent timeline */}
              {recentActivities.length > 0 && (
                <div className="pt-4 mt-4 border-t">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
                    Recent activity
                  </p>
                  <div className="space-y-0">
                    {recentActivities.map((activity) => {
                      const config = ACTIVITY_TYPES.find((t) => t.key === activity.activityType);
                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-2.5 py-2.5 border-b border-dashed last:border-0"
                        >
                          <div
                            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-medium"
                            style={{ backgroundColor: config?.color ?? "#6b7280" }}
                          >
                            {config?.label?.[0] ?? "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-navy">
                                {config?.label ?? activity.activityType}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDate(activity.date)} {formatTime(activity.time)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground/80 line-clamp-2 mt-0.5 leading-relaxed">
                              {activity.detail}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

