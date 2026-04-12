"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const TOP_COUNT = 5;

interface LeadSourcePickerProps {
  value: string;
  onChange: (value: string) => void;
}

type SourceOption = { key: string; label: string };

export function LeadSourcePicker({ value, onChange }: LeadSourcePickerProps) {
  const [expanded, setExpanded] = useState(false);
  const [sources, setSources]   = useState<SourceOption[]>([]);
  const [loading, setLoading]   = useState(true);

  // Fetch active sources from the DB-backed API on mount.
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/lead-sources", {
          credentials: "same-origin",
          signal:      controller.signal,
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          data?: { key: string; label: string; active: boolean }[];
        };
        setSources(
          (json.data ?? [])
            .filter((s) => s.active)
            .map((s) => ({ key: s.key, label: s.label })),
        );
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const primary = sources.slice(0, TOP_COUNT);
  const secondary = sources.slice(TOP_COUNT);
  const selectedInSecondary = secondary.some((s) => s.key === value);
  const showSecondary = expanded || selectedInSecondary;

  if (loading) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="h-7 w-20 rounded-full bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No lead sources configured. Ask an admin to add some in Admin &gt; Lead Sources.
      </p>
    );
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
        {!showSecondary && secondary.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-0.5 rounded-full px-2.5 py-1.5 text-xs text-muted-foreground hover:text-navy hover:bg-muted transition-colors"
          >
            More <ChevronDown size={11} />
          </button>
        )}
      </div>

      {showSecondary && secondary.length > 0 && !selectedInSecondary && (
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-navy ml-auto"
          >
            Less <ChevronUp size={10} />
          </button>
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
