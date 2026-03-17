"use client";

import { computeDateOffset } from "@/lib/format";

const CHIPS = [
  { label: "Today", offset: "today" },
  { label: "Tomorrow", offset: "tomorrow" },
  { label: "+3d", offset: "+3d" },
  { label: "Mon", offset: "next_mon" },
  { label: "Fri", offset: "next_fri" },
  { label: "+1w", offset: "+1w" },
  { label: "+2w", offset: "+2w" },
];

interface DateQuickPickProps {
  value: string;
  onChange: (date: string) => void;
}

export function DateQuickPick({ value, onChange }: DateQuickPickProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {CHIPS.map((chip) => {
        const date = computeDateOffset(chip.offset);
        const isActive = value === date;
        return (
          <button
            key={chip.offset}
            type="button"
            onClick={() => onChange(date)}
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
              isActive
                ? "bg-gold text-navy"
                : "bg-muted text-muted-foreground hover:bg-gold/20 hover:text-navy"
            }`}
          >
            {chip.label}
          </button>
        );
      })}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border bg-card px-2 py-0.5 text-xs"
      />
    </div>
  );
}
