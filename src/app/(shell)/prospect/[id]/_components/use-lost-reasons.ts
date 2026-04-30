"use client";

import { useEffect, useState } from "react";
import { LOST_REASONS } from "@/lib/constants";
import { makeRequest } from "./utils";

// ─── Lost-reason picklist hook ────────────────────────────────────────────────

export type LostReasonOption = { display_value: string; actual_value: string };

/**
 * Loads the live `Lost_Dead_Reason` picklist from /api/prospects/lost-reasons.
 * Falls back to the hardcoded `LOST_REASONS` constant on fetch failure so the
 * UI stays usable when the route or Zoho is down.
 */
export function useLostReasons(enabled: boolean): {
  options: LostReasonOption[];
  loading: boolean;
  fellBack: boolean;
} {
  const [options,  setOptions]  = useState<LostReasonOption[]>(
    () => LOST_REASONS.map(r => ({ display_value: r.label, actual_value: r.label }))
  );
  const [loading,  setLoading]  = useState(false);
  const [fellBack, setFellBack] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let abort = false;
    setLoading(true);
    (async () => {
      try {
        const res = await makeRequest("/api/prospects/lost-reasons");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as { data?: LostReasonOption[] };
        const data = (json.data ?? []).filter(o => o.actual_value);
        if (abort) return;
        if (data.length === 0) {
          setOptions(LOST_REASONS.map(r => ({ display_value: r.label, actual_value: r.label })));
          setFellBack(true);
        } else {
          setOptions(data);
          setFellBack(false);
        }
      } catch {
        if (abort) return;
        setOptions(LOST_REASONS.map(r => ({ display_value: r.label, actual_value: r.label })));
        setFellBack(true);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [enabled]);

  return { options, loading, fellBack };
}
