"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { demoData } from "@/data/store";
import type { SystemConfig } from "@/lib/types";

interface SystemSettingsTabProps {
  config: SystemConfig;
}

export function SystemSettingsTab({ config }: SystemSettingsTabProps) {
  const [fundTarget, setFundTarget] = useState(config.fundTarget / 1_000_000);
  const [companyName, setCompanyName] = useState(config.companyName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await demoData.updateSystemConfig({
        fundTarget: fundTarget * 1_000_000,
        companyName,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
              value={fundTarget}
              onChange={(e) => setFundTarget(parseFloat(e.target.value) || 0)}
              className="w-32 h-9 text-sm"
            />
            <span className="text-sm text-muted-foreground">M</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Displayed on the Leadership Dashboard as the AUM progress target. Current: ${fundTarget}M
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Company Name
          </label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-64 h-9 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-gold px-5 py-2 text-xs font-medium text-navy hover:bg-gold-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {saved && (
          <span className="text-xs text-healthy-green font-medium">Settings saved</span>
        )}
      </div>
    </div>
  );
}
