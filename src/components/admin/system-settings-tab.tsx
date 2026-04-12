"use client";

import { useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { AppSettingsRow } from "@/services/app-settings";

interface SystemSettingsTabProps {
  config: AppSettingsRow;
}

export function SystemSettingsTab({ config }: SystemSettingsTabProps) {
  // Display fund target in millions; store in dollars.
  const [fundTargetM, setFundTargetM] = useState(config.fundTarget / 1_000_000);
  const [companyName, setCompanyName] = useState(config.companyName);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method:      "PUT",
        headers:     { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          companyName: companyName.trim(),
          fundTarget:  Math.round(fundTargetM * 1_000_000),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `Save failed (${res.status})`);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Fund Target ($M)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={fundTargetM}
              onChange={(e) => setFundTargetM(parseFloat(e.target.value) || 0)}
              className="w-32 h-9 text-sm"
            />
            <span className="text-sm text-muted-foreground">M</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Displayed on the Leadership Dashboard as the AUM progress target. Current: ${fundTargetM}M
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Company Name
          </label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="OwnEZ Capital"
            className="w-64 h-9 text-sm"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Shown in the sidebar header. Defaults to &quot;OwnEZ Capital&quot; if left blank.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-alert-red/25 bg-alert-red/5 px-3 py-2 text-xs text-alert-red max-w-md">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-full bg-gold px-5 py-2 text-xs font-medium text-navy hover:bg-gold-hover disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs text-healthy-green font-medium">
            <Check size={12} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
