/**
 * Terminology mapping for the commitment lifecycle.
 *
 * Per the Zoho integration spec §1.2, the internal/API vocabulary is
 * `Commitment_Set` / `fulfilled` / `superseded` / `cancelled`. The web UI
 * translates those to plain English for users: "Next action set" / "Done" /
 * "Replaced" / "Cancelled".
 *
 * Single source of truth for that translation.
 */

import type { ZohoCommitmentStatus } from "@/types";

export const COMMITMENT_STATUS_LABEL: Record<
  ZohoCommitmentStatus,
  { badge: string; text: string }
> = {
  open:       { badge: "",            text: "Open"      },
  fulfilled:  { badge: "✓ done",      text: "Done"      },
  superseded: { badge: "↺ replaced",  text: "Replaced"  },
  cancelled:  { badge: "✕ cancelled", text: "Cancelled" },
};

/**
 * Hotkey → close-out action. Matches the PDF user guide:
 * D = Done (fulfilled), P = Still pending (no-op), R = Replace (superseded).
 */
export const CLOSE_OUT_HOTKEYS = {
  d: "fulfilled",
  p: "pending",
  r: "superseded",
} as const;

export type CloseOutAction = "fulfilled" | "pending" | "superseded";
