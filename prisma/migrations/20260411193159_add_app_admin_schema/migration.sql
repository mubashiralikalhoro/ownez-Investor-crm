-- CreateTable
CREATE TABLE "UserPermission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zohoUserId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "canViewLeadership" BOOLEAN,
    "canAccessAdmin" BOOLEAN,
    "canReassignProspects" BOOLEAN,
    "canViewAllProspects" BOOLEAN,
    "canMarkDead" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LeadSource" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "zohoSynced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "companyName" TEXT NOT NULL DEFAULT 'OwnEZ Capital',
    "fundTarget" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_zohoUserId_key" ON "UserPermission"("zohoUserId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadSource_key_key" ON "LeadSource"("key");
