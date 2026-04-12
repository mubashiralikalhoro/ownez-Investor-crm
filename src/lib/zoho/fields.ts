/**
 * Zoho CRM v8 Fields Metadata wrappers for the Prospect module's Lead_Source
 * picklist.
 *
 * Used by the Lead Sources admin tab to mirror locally-created sources into
 * Zoho's picklist so prospect creation with that source succeeds.
 *
 * Required OAuth scope (added to the start route): `ZohoCRM.settings.ALL`
 * (or the narrower `ZohoCRM.settings.fields.ALL`).
 *
 * Note: the PUT body shape for updating a field's picklist values is not
 * publicly documented in the JSON spec shipped with Zoho. At first write we
 * send `{ data: [{ pick_list_values: [...] }] }` which follows Zoho's usual
 * envelope. If Zoho rejects it, callers fall back to DB-only insertion and
 * surface a warning banner to the admin.
 */

import { zohoApi } from "@/lib/zoho/api-client";
import { AxiosError } from "axios";

export type ZohoPicklistValue = {
  display_value:    string;
  actual_value:     string;
  id?:              string;
  sequence_number?: number;
  type?:            string;
  reference_value?: string | null;
  colour_code?:     string | null;
};

type FieldsListResponse = {
  fields?: Array<{
    id:               string;
    api_name:         string;
    field_label?:     string;
    pick_list_values?: ZohoPicklistValue[];
  }>;
};

/**
 * GET /settings/fields?module=Prospect
 *
 * Finds the Lead_Source field on the Prospect module and returns its id plus
 * current picklist values. Returns null if the field can't be located.
 */
export async function fetchProspectLeadSourceField(
  accessToken: string,
): Promise<{ id: string; picklist: ZohoPicklistValue[] } | null> {
  try {
    const { data } = await zohoApi.get<FieldsListResponse>(
      accessToken,
      "/settings/fields",
      { module: "Prospect" },
    );
    const field = data.fields?.find(f => f.api_name === "Lead_Source");
    if (!field?.id) return null;
    return {
      id:       field.id,
      picklist: field.pick_list_values ?? [],
    };
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 204) return null;
    throw err;
  }
}

// ─── Layout helpers (needed for picklist value removal) ──────────────────────

type LayoutSection = {
  id: string;
  fields?: Array<{
    id:               string;
    api_name:         string;
    pick_list_values?: Array<{ display_value: string; id: string }>;
  }>;
};

type LayoutRow = {
  id:        string;
  name?:     string;
  sections?: LayoutSection[];
};

type LayoutsListResponse = {
  layouts?: LayoutRow[];
};

/**
 * Find the layout_id, section_id, and field picklist values with IDs for the
 * Lead_Source field. Returns null if not found.
 */
async function fetchLeadSourceLayoutInfo(accessToken: string): Promise<{
  layoutId:  string;
  sectionId: string;
  fieldId:   string;
  values:    Array<{ display_value: string; id: string }>;
} | null> {
  try {
    const { data } = await zohoApi.get<LayoutsListResponse>(
      accessToken,
      "/settings/layouts",
      { module: "Prospect" },
    );
    for (const layout of data.layouts ?? []) {
      for (const section of layout.sections ?? []) {
        const field = section.fields?.find(f => f.api_name === "Lead_Source");
        if (field?.id && field.pick_list_values) {
          return {
            layoutId:  layout.id,
            sectionId: section.id,
            fieldId:   field.id,
            values:    field.pick_list_values,
          };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export type AddPicklistResult =
  | { ok: true;  alreadyPresent: boolean }
  | { ok: false; error: string };

/**
 * Add a new value to the Prospect module's `Lead_Source` picklist.
 *
 * If `newValue` already exists (case-insensitive `actual_value` match), this
 * is a successful no-op — no Zoho call is made.
 *
 * On a Zoho API failure the function returns `{ ok: false, error }` rather
 * than throwing, so the caller can degrade gracefully (DB-only insert with
 * an "unsynced" warning).
 */
export async function addZohoLeadSourcePicklistValue(
  accessToken: string,
  newValue: string,
): Promise<AddPicklistResult> {
  const trimmed = newValue.trim();
  if (!trimmed) return { ok: false, error: "Empty picklist value." };

  let field: { id: string; picklist: ZohoPicklistValue[] } | null;
  try {
    field = await fetchProspectLeadSourceField(accessToken);
  } catch (err) {
    const msg = err instanceof AxiosError
      ? `Zoho fields lookup failed (${err.response?.status ?? "network"})`
      : err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
  if (!field) return { ok: false, error: "Lead_Source field not found on Prospect module." };

  // Already present?
  const exists = field.picklist.some(
    v => v.actual_value.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exists) return { ok: true, alreadyPresent: true };

  // Send ONLY the new value — Zoho appends it to the existing list.
  // Sending existing values back causes DUPLICATE_DATA errors.
  try {
    await zohoApi.patch(
      accessToken,
      `/settings/fields/${field.id}`,
      { fields: [{ pick_list_values: [{ display_value: trimmed, actual_value: trimmed }] }] },
      { params: { module: "Prospect" } },
    );
    return { ok: true, alreadyPresent: false };
  } catch (err) {
    if (err instanceof AxiosError) {
      const status = err.response?.status ?? "network";
      const body   = err.response?.data as { message?: string; code?: string } | undefined;
      const inner  = (body as { data?: Array<{ message?: string; code?: string }> } | undefined)?.data?.[0];
      return {
        ok: false,
        error: `Zoho fields update failed (${status}): [${inner?.code ?? body?.code ?? "UNKNOWN"}] ${inner?.message ?? body?.message ?? err.message}`,
      };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export type RemovePicklistResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Remove a value from the Prospect module's `Lead_Source` picklist.
 *
 * Uses the Layout API (PATCH /settings/layouts/{id}?module=Prospect) — the
 * only Zoho endpoint that supports removing picklist values. Sends all
 * values to KEEP; omitted values are moved to the "unused" section.
 */
export async function removeZohoLeadSourcePicklistValue(
  accessToken: string,
  valueToRemove: string,
): Promise<RemovePicklistResult> {
  const trimmed = valueToRemove.trim();
  if (!trimmed) return { ok: false, error: "Empty picklist value." };

  const info = await fetchLeadSourceLayoutInfo(accessToken);
  if (!info) return { ok: false, error: "Could not find Lead_Source field in any Prospect layout." };

  const exists = info.values.some(
    v => v.display_value.toLowerCase() === trimmed.toLowerCase(),
  );
  if (!exists) return { ok: true };

  const remaining = info.values
    .filter(v => v.display_value.toLowerCase() !== trimmed.toLowerCase())
    .map(v => ({ display_value: v.display_value, id: v.id }));

  try {
    await zohoApi.patch(
      accessToken,
      `/settings/layouts/${info.layoutId}`,
      {
        layouts: [{
          id: info.layoutId,
          sections: [{
            id: info.sectionId,
            fields: [{
              id: info.fieldId,
              pick_list_values: remaining,
            }],
          }],
        }],
      },
      { params: { module: "Prospect" } },
    );
    return { ok: true };
  } catch (err) {
    if (err instanceof AxiosError) {
      const status = err.response?.status ?? "network";
      const body   = err.response?.data as Record<string, unknown> | undefined;
      return {
        ok: false,
        error: `Zoho layout update failed (${status}): ${JSON.stringify(body ?? err.message).slice(0, 200)}`,
      };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
