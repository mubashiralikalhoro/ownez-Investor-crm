"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";

interface BackgroundNotesProps {
  personId: string;
  notes: string | null;
}

export function BackgroundNotes({ personId, notes }: BackgroundNotesProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState(notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/persons/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: text }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-navy transition-colors"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Background Notes
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Background context — use Quick Log for activities."
            className="w-full rounded-md border bg-card px-3 py-2 text-xs leading-relaxed resize-y min-h-[80px]"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || text === (notes ?? "")}
              className="rounded-full bg-gold px-3 py-1 text-[10px] font-medium text-navy hover:bg-gold-hover disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Notes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
