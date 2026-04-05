"use client";

import { useState } from "react";
import { LEAD_SOURCES } from "@/lib/constants";
import { ChevronDown, ChevronUp } from "lucide-react";

const TOP_COUNT = 5;

interface LeadSourcePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function LeadSourcePicker({ value, onChange }: LeadSourcePickerProps) {
  const [expanded, setExpanded] = useState(false);
  const [extraSources, setExtraSources] = useState<{ key: string; label: string }[]>([]);
  const [newSource, setNewSource] = useState("");
  const [adding, setAdding] = useState(false);

  const allSources = [...LEAD_SOURCES, ...extraSources];
  const primary = allSources.slice(0, TOP_COUNT);
  const secondary = allSources.slice(TOP_COUNT);
  const selectedInSecondary = secondary.some((s) => s.key === value);
  const showSecondary = expanded || selectedInSecondary;

  function handleAddSource() {
    const label = newSource.trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

    const existing = allSources.find((s) => s.key === key || s.label.toLowerCase() === label.toLowerCase());
    if (existing) {
      onChange(existing.key);
    } else {
      setExtraSources((prev) => [...prev, { key, label }]);
      onChange(key);
    }

    setNewSource("");
    setAdding(false);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {primary.map((source) => (
          <Chip
            key={source.key}
            label={source.label}
            active={value === source.key}
            onClick={() => onChange(source.key)}
          />
        ))}
        {showSecondary && secondary.map((source) => (
          <Chip
            key={source.key}
            label={source.label}
            active={value === source.key}
            onClick={() => onChange(source.key)}
          />
        ))}
        {!showSecondary && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-0.5 rounded-full px-2.5 py-1.5 text-xs text-muted-foreground hover:text-navy hover:bg-muted transition-colors"
          >
            More <ChevronDown size={11} />
          </button>
        )}
      </div>

      {showSecondary && (
        <div className="flex items-center gap-2 mt-2">
          {adding ? (
            <div className="flex items-center gap-1.5 flex-1">
              <input
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder="New source name..."
                className="rounded-full border bg-white px-3 py-1 text-xs flex-1 outline-none focus:border-gold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSource();
                  if (e.key === "Escape") { setAdding(false); setNewSource(""); }
                }}
              />
              <button
                type="button"
                onClick={handleAddSource}
                disabled={!newSource.trim()}
                className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-medium text-navy hover:bg-gold-hover disabled:opacity-40"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setAdding(false); setNewSource(""); }}
                className="text-[10px] text-muted-foreground hover:text-navy"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="text-[10px] font-medium text-gold hover:underline"
              >
                + New source
              </button>
              {!selectedInSecondary && (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-navy ml-auto"
                >
                  Less <ChevronUp size={10} />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-gold text-navy"
          : "bg-muted text-muted-foreground hover:bg-gold/15 hover:text-navy"
      }`}
    >
      {label}
    </button>
  );
}
