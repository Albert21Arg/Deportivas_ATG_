-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "birthDate" DATETIME,
    "documentNumber" TEXT,
    "jerseyNumber" TEXT,
    "photo" TEXT,
    "paidUntil" DATETIME,
    "showName" BOOLEAN NOT NULL DEFAULT true,
    "yellowCardFinePaidCount" INTEGER NOT NULL DEFAULT 0,
    "redCardFinePaidCount" INTEGER NOT NULL DEFAULT 0,
    "blueCardFinePaidCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Player" ("birthDate", "blueCardFinePaidCount", "createdAt", "documentNumber", "id", "jerseyNumber", "name", "paidUntil", "photo", "redCardFinePaidCount", "showName", "status", "updatedAt", "yellowCardFinePaidCount") SELECT "birthDate", "blueCardFinePaidCount", "createdAt", "documentNumber", "id", "jerseyNumber", "name", "paidUntil", "photo", "redCardFinePaidCount", "showName", "status", "updatedAt", "yellowCardFinePaidCount" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE UNIQUE INDEX "Player_documentNumber_key" ON "Player"("documentNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
