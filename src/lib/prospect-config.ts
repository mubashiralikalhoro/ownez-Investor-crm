/**
 * Prospect module configuration — single source of truth.
 *
 * All Zoho field labels, stage ordering, and display order are defined here.
 * Update this file to change how the prospect detail page renders data.
 */

// ─── Pipeline Stage Progression ──────────────────────────────────────────────
// Order matters: index 0 = earliest stage, index N = furthest.
// If current stage is at index N, all indices < N are shown as "done".

export const PROSPECT_PROGRESSION_STAGES = [
  { value: "Prospect",               label: "Prospect",               order: 1 },
  { value: "Initial Contact",        label: "Initial Contact",        order: 2 },
  { value: "Discovery",              label: "Discovery",              order: 3 },
  { value: "Pitch",                  label: "Pitch",                  order: 4 },
  { value: "Active Engagement",      label: "Active Engagement",      order: 5 },
  { value: "Soft Commit",            label: "Soft Commit",            order: 6 },
  { value: "Commitment Processing",  label: "Commitment Processing",  order: 7 },
  { value: "KYC / Docs",             label: "KYC / Docs",            order: 8 },
  { value: "Funded",                 label: "Funded",                 order: 9 },
] as const;

export type ProspectProgressionStageValue =
  (typeof PROSPECT_PROGRESSION_STAGES)[number]["value"];

// Exit / special stages — not part of the linear progression
export const PROSPECT_SPECIAL_STAGES = [
  { value: "Nurture",    label: "Nurture",    color: "text-gold" },
  { value: "Dead / Lost", label: "Dead / Lost", color: "text-alert-red" },
] as const;

/** Returns true if the given stage value is a special (exit) stage. */
export function isSpecialProspectStage(stage: string | null | undefined): boolean {
  return PROSPECT_SPECIAL_STAGES.some((s) => s.value === stage);
}

/** Returns the 0-based index in PROSPECT_PROGRESSION_STAGES, or -1 if not found. */
export function getProspectStageIndex(stage: string | null | undefined): number {
  if (!stage) return -1;
  return PROSPECT_PROGRESSION_STAGES.findIndex((s) => s.value === stage);
}

// ─── Profile Card Field Definitions ──────────────────────────────────────────
// Controls both which fields appear and their display order.
// "section" groups them visually in the card.

export type ProspectFieldType =
  | "currency"
  | "text"
  | "integer_days"
  | "date"
  | "datetime"
  | "owner"   // { name, id, email } object — displays .name
  | "lookup"  // { name, id } object — displays .name
  | "boolean";

export type ProspectFieldSection =
  | "financials"  // Rendered as 3-column grid at the top of the card
  | "details";    // Rendered as label/value rows below the grid

export interface ProspectFieldDef {
  /** Zoho API field name */
  api_name: string;
  /** Human-readable label */
  label: string;
  /** Controls how the raw value is formatted */
  type: ProspectFieldType;
  /** Which visual group this field belongs to */
  section: ProspectFieldSection;
  /**
   * Optional: only show this field when the prospect is in one of these stages.
   * Omit to always show (if the value is non-empty).
   */
  showForStages?: string[];
}

/**
 * Fields to show in the profile card, in display order.
 * Edit this array to add, remove, or reorder fields.
 */
export const PROSPECT_PROFILE_FIELDS: ProspectFieldDef[] = [
  // ── Financials (3-col grid) ───────────────────────────────────────────────
  {
    api_name: "Initial_Investment_Target",
    label: "Target",
    type: "currency",
    section: "financials",
  },
  {
    api_name: "Growth_Target",
    label: "Growth",
    type: "currency",
    section: "financials",
  },
  {
    api_name: "Committed_Amount",
    label: "Committed",
    type: "currency",
    section: "financials",
  },

  // ── Detail Rows ───────────────────────────────────────────────────────────
  {
    api_name: "Lead_Source",
    label: "Lead Source",
    type: "text",
    section: "details",
  },
  {
    api_name: "Add_Lead_Source",
    label: "Add. Source",
    type: "text",
    section: "details",
  },
  {
    api_name: "Owner",
    label: "Prospect Owner",
    type: "owner",
    section: "details",
  },
  {
    api_name: "Company_Entity",
    label: "Company / Entity",
    type: "text",
    section: "details",
  },
  {
    api_name: "Days_Since_Last_Touch",
    label: "Days Since Touch",
    type: "integer_days",
    section: "details",
  },
  {
    api_name: "Last_Activity_Date",
    label: "Last Activity",
    type: "date",
    section: "details",
  },
  {
    api_name: "Lost_Dead_Reason",
    label: "Lost / Dead Reason",
    type: "text",
    section: "details",
    // Only meaningful when the prospect is in an exit stage
    showForStages: ["Dead / Lost", "Nurture"],
  },
  {
    api_name: "Funded_Investor",
    label: "Funded Investor",
    type: "lookup",
    section: "details",
    showForStages: ["Funded"],
  },
  {
    api_name: "Created_By",
    label: "Created By",
    type: "owner",
    section: "details",
  },
  {
    api_name: "Created_Time",
    label: "Created",
    type: "datetime",
    section: "details",
  },
  {
    api_name: "Modified_By",
    label: "Modified By",
    type: "owner",
    section: "details",
  },
  {
    api_name: "Modified_Time",
    label: "Last Modified",
    type: "datetime",
    section: "details",
  },
];
