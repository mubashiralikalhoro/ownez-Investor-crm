"use client";

import { useState } from "react";
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
import { formatRelativeDate, computeDateOffset } from "@/lib/format";
import { DateQuickPick } from "@/components/ui/date-quick-pick";
import { LeadSourcePicker } from "@/components/ui/lead-source-picker";
import { getAppUserProfile } from "@/lib/auth-storage";

export function CreateProspectSheet() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdProspect, setCreatedProspect] = useState<{ id: string; fullName: string } | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [nextActionType, setNextActionType] = useState("follow_up");
  const [nextActionDetail, setNextActionDetail] = useState("Schedule intro call");
  const [nextActionDate, setNextActionDate] = useState(() => computeDateOffset("tomorrow"));

  function resetForm() {
    setFullName("");
    setPhone("");
    setEmail("");
    setLeadSource("");
    setNextActionType("follow_up");
    setNextActionDetail("Schedule intro call");
    setNextActionDate(computeDateOffset("tomorrow"));
    setError(null);
    setCreatedProspect(null);
  }

  const isValid = fullName.trim() && leadSource && nextActionDetail.trim() && nextActionDate;

  async function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    setError(null);

    const doPost = async () => {
      const res = await fetch("/api/prospects", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name:           fullName.trim(),
          email:          email.trim() || null,
          phone:          phone.trim() || null,
          leadSourceKey:  leadSource,
          nextAction:     nextActionDetail.trim() || null,
          nextActionDate: nextActionDate || null,
          ownerZohoId:    getAppUserProfile()?.id ?? null,
        }),
      });
      if (res.status === 401) throw new Error("__401__");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<{ data: { id: string; name: string } }>;
    };

    try {
      let json: { data: { id: string; name: string } };
      try {
        json = await doPost();
      } catch (e) {
        if (e instanceof Error && e.message === "__401__") {
          const ok = (await fetch("/api/auth/zoho/refresh", { method: "POST", credentials: "same-origin" })).ok;
          if (!ok) throw new Error("Session expired. Please log in again.");
          json = await doPost();
        } else {
          throw e;
        }
      }

      setCreatedProspect({ id: json.data.id, fullName: fullName.trim() });
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
          {createdProspect ? (
            /* ── Success screen ── */
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-healthy-green/10 flex items-center justify-center shrink-0">
                  <Check size={16} className="text-healthy-green" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy">{createdProspect.fullName}</p>
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
                  href={`/prospect/${createdProspect.id}`}
                  className="flex-1 rounded-full border border-navy/20 py-2.5 text-center text-sm font-medium text-navy hover:bg-muted/50 transition-colors"
                >
                  Open Prospect
                </a>
                <button
                  onClick={() => { resetForm(); setOpen(false); window.location.reload(); }}
                  className="flex-1 rounded-full bg-gold py-2.5 text-center text-sm font-semibold text-navy hover:bg-gold-hover transition-colors"
                >
                  Back to dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
