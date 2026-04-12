/**
 * Shared PrismaClient singleton.
 *
 * Next.js dev mode hot-reloads server modules, which — without guarding —
 * would spawn a fresh PrismaClient (and a fresh SQLite connection pool) on
 * every file change. Stashing the instance on `globalThis` keeps a single
 * client across reloads.
 *
 * Zoho CRM is the system of record for prospects, calls, notes, events,
 * stages, etc. This Prisma client is for *additive* local features only —
 * app-specific state that has no Zoho equivalent.
 *
 * Import: `import { prisma } from "@/lib/prisma";`
 */

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

const adapter = new PrismaBetterSqlite3({ url });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
