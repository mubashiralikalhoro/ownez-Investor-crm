"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { NEXT_ACTION_TYPES } from "@/lib/constants";
import { formatRelativeDate, computeDateOffset, getTodayCT } from "@/lib/format";
import { DateQuickPick } from "@/components/ui/date-quick-pick";
import { LeadSourcePicker } from "@/components/ui/lead-source-picker";
import { demoData } from "@/data/store";
import type { LeadSource, NextActionType, User } from "@/lib/types";

interface CreateProspectSheetProps {
  currentUserId: string;
  users: User[];
}

export function CreateProspectSheet({ currentUserId, users }: CreateProspectSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPerson, setCreatedPerson] = useState<{ id: string; fullName: string } | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [nextActionType, setNextActionType] = useState("follow_up");
  const [nextActionDetail, setNextActionDetail] = useState("Schedule intro call");
  const [nextActionDate, setNextActionDate] = useState(() => computeDateOffset("tomorrow"));
  const [assignedRepId, setAssignedRepId] = useState(currentUserId);

  function resetForm() {
    setFullName("");
    setPhone("");
    setEmail("");
    setLeadSource("");
    setNextActionType("follow_up");
    setNextActionDetail("Schedule intro call");
    setNextActionDate(computeDateOffset("tomorrow"));
    setAssignedRepId(currentUserId);
    setError(null);
    setCreatedPerson(null);
  }

  const isValid = fullName.trim() && leadSource && nextActionDetail.trim() && nextActionDate;

  async function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    setError(null);

    try {
      const person = await demoData.createPerson({
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        leadSource: leadSource as LeadSource,
        nextActionType: nextActionType as NextActionType,
        nextActionDetail: nextActionDetail.trim(),
        nextActionDate,
        assignedRepId,
        roles: ["prospect"],
      });
      const now = new Date();
      const currentTime = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Chicago",
      });
      await demoData.createActivity(person.id, {
        activityType: "note",
        source: "manual",
        date: getTodayCT(),
        time: currentTime,
        outcome: "connected",
        detail: "Prospect added to pipeline.",
        documentsAttached: [],
        loggedById: currentUserId,
        annotation: null,
      });
      setCreatedPerson({ id: person.id, fullName: fullName.trim() });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <SheetTrigger className="inline-flex items-center gap-1 md:gap-1.5 rounded-full border border-navy/20 px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-navy hover:bg-muted transition-colors cursor-pointer">
        <Plus size={14} className="shrink-0" />
        Prospect
      </SheetTrigger>
      <SheetContent side="right" className="p-0 overflow-y-auto">
        <SheetHeader className="border-b p-4">
          <SheetTitle>New Prospect</SheetTitle>
          <SheetDescription>
            Stage will be set to Prospect automatically.
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-4">
          {createdPerson ? (
            /* Success screen */
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-healthy-green/10 flex items-center justify-center shrink-0">
                  <Check size={16} className="text-healthy-green" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy">{createdPerson.fullName}</p>
                  <p className="text-xs text-healthy-green font-medium">Added to pipeline</p>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Stage</span>
                  <span className="font-medium text-navy">Prospect</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Next action</span>
                  <span className="font-medium text-navy">
                    {NEXT_ACTION_TYPES.find((t) => t.key === nextActionType)?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>When</span>
                  <span className="font-medium text-navy">
                    {formatRelativeDate(nextActionDate)} · {nextActionDate}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <a
                  href={`/person/${createdPerson.id}`}
                  className="flex-1 rounded-full border border-navy/20 py-2.5 text-center text-sm font-medium text-navy hover:bg-muted/50 transition-colors"
                >
                  Open profile
                </a>
                <button
                  onClick={() => { resetForm(); setOpen(false); window.location.reload(); }}
                  className="flex-1 rounded-full bg-gold py-2.5 text-center text-sm font-semibold text-navy hover:bg-gold-hover transition-colors"
                >
                  Back to dashboard
                </button>
              </div>
            </div>
          ) : <>
          {error && (
            <div className="rounded-md bg-alert-red/10 px-3 py-2 text-sm text-alert-red">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Robert Calloway"
              autoFocus
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="robert@example.com"
            />
          </div>

          {/* Lead Source */}
          <div className="space-y-1.5">
            <Label>How did you meet? *</Label>
            <LeadSourcePicker value={leadSource} onChange={setLeadSource} />
          </div>

          {/* Assigned Rep */}
          <div className="space-y-1.5">
            <Label htmlFor="assignedRep">Assigned Rep *</Label>
            <select
              id="assignedRep"
              value={assignedRepId}
              onChange={(e) => setAssignedRepId(e.target.value)}
              className="w-full rounded-md border bg-card px-3 py-2 text-sm"
            >
              {users
                .filter((u) => u.isActive)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
            </select>
          </div>

          <hr className="border-border" />

          {/* Next Action Type */}
          <div className="space-y-1.5">
            <Label htmlFor="nextActionType">Next Action *</Label>
            <select
              id="nextActionType"
              value={nextActionType}
              onChange={(e) => setNextActionType(e.target.value)}
              className="w-full rounded-md border bg-card px-3 py-2 text-sm"
            >
              {NEXT_ACTION_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Next Action Detail */}
          <div className="space-y-1.5">
            <Label htmlFor="nextActionDetail">Action Detail *</Label>
            <Input
              id="nextActionDetail"
              value={nextActionDetail}
              onChange={(e) => setNextActionDetail(e.target.value)}
              placeholder="Schedule intro call"
            />
          </div>

          {/* Next Action Date */}
          <div className="space-y-1.5">
            <Label>Action Date *</Label>
            <DateQuickPick value={nextActionDate} onChange={setNextActionDate} />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="w-full rounded-full bg-gold py-2.5 text-sm font-medium text-navy hover:bg-gold-hover disabled:opacity-50 transition-colors"
            >
              {submitting ? "Creating..." : "Create Prospect"}
            </button>
          </div>
          </>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
