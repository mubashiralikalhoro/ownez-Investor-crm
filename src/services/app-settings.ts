/**
 * App-wide settings — a singleton row in the `AppSettings` table.
 *
 * Read at server-component / API time to surface the company name in the
 * sidebar and the fund target on the Leadership dashboard. Admins update
 * these values via the Admin > Settings tab.
 */

import { prisma } from "@/lib/prisma";

export type AppSettingsRow = {
  id:          number;
  companyName: string;
  fundTarget:  number; // dollars (not millions)
};

const DEFAULTS = {
  companyName: "OwnEZ Capital",
  fundTarget:  0,
};

/** Read the singleton settings row, creating it with defaults on first call. */
export async function getAppSettings(): Promise<AppSettingsRow> {
  const row = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (row) {
    return { id: row.id, companyName: row.companyName, fundTarget: row.fundTarget };
  }
  const created = await prisma.appSettings.create({
    data: { id: 1, ...DEFAULTS },
  });
  return { id: created.id, companyName: created.companyName, fundTarget: created.fundTarget };
}

export type UpdateAppSettingsInput = {
  companyName?: string;
  fundTarget?:  number;
};

export async function updateAppSettings(input: UpdateAppSettingsInput): Promise<AppSettingsRow> {
  // Ensure the row exists before updating.
  await getAppSettings();

  const data: Record<string, unknown> = {};
  if (input.companyName !== undefined) {
    const trimmed = input.companyName.trim();
    data.companyName = trimmed || DEFAULTS.companyName;
  }
  if (input.fundTarget !== undefined) {
    if (!Number.isFinite(input.fundTarget) || input.fundTarget < 0) {
      throw new Error("fundTarget must be a non-negative number.");
    }
    data.fundTarget = Math.round(input.fundTarget);
  }

  const updated = await prisma.appSettings.update({
    where: { id: 1 },
    data,
  });
  return { id: updated.id, companyName: updated.companyName, fundTarget: updated.fundTarget };
}
