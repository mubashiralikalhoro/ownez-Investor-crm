/**
 * Lead-source service — the DB is the source of truth for what shows up in
 * lead-source dropdowns across the app. New sources are mirrored into the
 * Zoho `Lead_Source` picklist so prospects created with them won't get
 * rejected by Zoho.
 */

import { prisma } from "@/lib/prisma";
import {
  addZohoLeadSourcePicklistValue,
  removeZohoLeadSourcePicklistValue,
  fetchProspectLeadSourceField,
} from "@/lib/zoho/fields";

export type LeadSourceRow = {
  id:           number;
  key:          string;
  label:        string;
  displayOrder: number;
  active:       boolean;
  zohoSynced:   boolean;
};

const SEED: Array<Omit<LeadSourceRow, "id">> = [
  { key: "Velocis Network",       label: "Velocis Network",       displayOrder:  1, active: true, zohoSynced: true },
  { key: "CPA Referral",          label: "CPA Referral",          displayOrder:  2, active: true, zohoSynced: true },
  { key: "Legacy Event",          label: "Legacy Event",          displayOrder:  3, active: true, zohoSynced: true },
  { key: "LinkedIn",              label: "LinkedIn",              displayOrder:  4, active: true, zohoSynced: true },
  { key: "Ken - DBJ List",        label: "Ken - DBJ List",        displayOrder:  5, active: true, zohoSynced: true },
  { key: "Ken - Event Follow-up", label: "Ken - Event Follow-up", displayOrder:  6, active: true, zohoSynced: true },
  { key: "Tolleson WM",           label: "Tolleson WM",           displayOrder:  7, active: true, zohoSynced: true },
  { key: "M&A Attorney",          label: "M&A Attorney",          displayOrder:  8, active: true, zohoSynced: true },
  { key: "Cold Outreach",         label: "Cold Outreach",         displayOrder:  9, active: true, zohoSynced: true },
  { key: "Other",                 label: "Other",                 displayOrder: 10, active: true, zohoSynced: true },
];

export async function seedLeadSourcesIfEmpty(): Promise<void> {
  const count = await prisma.leadSource.count();
  if (count > 0) return;
  await prisma.leadSource.createMany({ data: SEED });
}

/** Public read — only sources that are active AND synced to Zoho. */
export async function listActiveLeadSources(): Promise<LeadSourceRow[]> {
  await seedLeadSourcesIfEmpty();
  return prisma.leadSource.findMany({
    where:   { active: true, zohoSynced: true },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });
}

/** Admin read — everything including inactive and unsynced. */
export async function listAllLeadSources(): Promise<LeadSourceRow[]> {
  await seedLeadSourcesIfEmpty();
  return prisma.leadSource.findMany({
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
  });
}

// ─── Create ──────────────────────────────────────────────────────────────────

export type CreateLeadSourceResult = {
  row:          LeadSourceRow;
  zohoSynced:   boolean;
  zohoWarning?: string;
};

export async function createLeadSource(
  accessToken: string,
  input: { key: string; label?: string },
): Promise<CreateLeadSourceResult> {
  const key   = input.key.trim();
  const label = (input.label ?? key).trim();
  if (!key) throw new Error("Lead source key is required.");

  const existing = await prisma.leadSource.findUnique({ where: { key } });
  if (existing) throw new Error(`Lead source "${key}" already exists.`);

  const max = await prisma.leadSource.findFirst({
    orderBy: { displayOrder: "desc" },
    select:  { displayOrder: true },
  });

  const row = await prisma.leadSource.create({
    data: {
      key,
      label,
      displayOrder: (max?.displayOrder ?? 0) + 1,
      active:       true,
      zohoSynced:   false,
    },
  });

  const zohoResult = await addZohoLeadSourcePicklistValue(accessToken, key);

  if (zohoResult.ok) {
    const updated = await prisma.leadSource.update({
      where: { id: row.id },
      data:  { zohoSynced: true },
    });
    return { row: updated, zohoSynced: true };
  }

  return {
    row,
    zohoSynced: false,
    zohoWarning: `Saved locally but Zoho sync failed: ${zohoResult.error}`,
  };
}

// ─── Retry sync ──────────────────────────────────────────────────────────────

export async function syncLeadSourceToZoho(
  accessToken: string,
  id: number,
): Promise<{ row: LeadSourceRow; zohoSynced: boolean; zohoWarning?: string }> {
  const row = await prisma.leadSource.findUnique({ where: { id } });
  if (!row) throw new Error("Lead source not found.");

  const result = await addZohoLeadSourcePicklistValue(accessToken, row.key);
  if (result.ok) {
    const updated = await prisma.leadSource.update({
      where: { id },
      data:  { zohoSynced: true },
    });
    return { row: updated, zohoSynced: true };
  }

  return { row, zohoSynced: false, zohoWarning: `Zoho sync failed: ${result.error}` };
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export type DeleteLeadSourceResult = {
  deleted:      boolean;
  zohoWarning?: string;
};

/**
 * Delete a lead source — removes from Zoho's picklist via the Layout API,
 * then deletes the DB row. If the Zoho removal fails, the row is still
 * deleted locally and a warning is returned.
 */
export async function deleteLeadSource(
  accessToken: string,
  id: number,
): Promise<DeleteLeadSourceResult> {
  const row = await prisma.leadSource.findUnique({ where: { id } });
  if (!row) throw new Error("Lead source not found.");

  let zohoWarning: string | undefined;

  if (row.zohoSynced) {
    const result = await removeZohoLeadSourcePicklistValue(accessToken, row.key);
    if (!result.ok) {
      zohoWarning = `Deleted locally but Zoho removal failed: ${result.error}`;
    }
  }

  await prisma.leadSource.delete({ where: { id } });
  return { deleted: true, zohoWarning };
}

// ─── Full bi-directional sync ────────────────────────────────────────────────

export type SyncAllResult = {
  added:   string[];   // Zoho values added to DB
  removed: string[];   // DB values removed (not in Zoho)
  error?:  string;
};

/**
 * Sync all lead sources with Zoho's Lead_Source picklist:
 * - Values in Zoho but not in DB → add to DB (zohoSynced: true)
 * - Values in DB but not in Zoho → delete from DB
 */
export async function syncAllLeadSourcesWithZoho(
  accessToken: string,
): Promise<SyncAllResult> {
  const field = await fetchProspectLeadSourceField(accessToken);
  if (!field) return { added: [], removed: [], error: "Lead_Source field not found on Prospect module." };

  const zohoValues = new Set(field.picklist.map(v => v.actual_value));
  const dbRows     = await prisma.leadSource.findMany();
  const dbKeys     = new Set(dbRows.map(r => r.key));

  const added:   string[] = [];
  const removed: string[] = [];

  // Add values from Zoho that are missing in DB.
  let nextOrder = Math.max(0, ...dbRows.map(r => r.displayOrder)) + 1;
  for (const val of zohoValues) {
    if (!dbKeys.has(val)) {
      await prisma.leadSource.create({
        data: {
          key:          val,
          label:        val,
          displayOrder: nextOrder++,
          active:       true,
          zohoSynced:   true,
        },
      });
      added.push(val);
    } else {
      // Mark existing DB rows as synced if they weren't already.
      await prisma.leadSource.updateMany({
        where: { key: val, zohoSynced: false },
        data:  { zohoSynced: true },
      });
    }
  }

  // Remove DB rows that are no longer in Zoho.
  for (const row of dbRows) {
    if (!zohoValues.has(row.key)) {
      await prisma.leadSource.delete({ where: { id: row.id } });
      removed.push(row.key);
    }
  }

  return { added, removed };
}

// ─── Simple update (label only now — active toggle removed) ──────────────────

export async function updateLeadSource(
  id: number,
  patch: { active?: boolean; label?: string },
): Promise<LeadSourceRow> {
  return prisma.leadSource.update({
    where: { id },
    data:  {
      ...(patch.active !== undefined ? { active: patch.active } : {}),
      ...(patch.label  !== undefined ? { label:  patch.label.trim() } : {}),
    },
  });
}
