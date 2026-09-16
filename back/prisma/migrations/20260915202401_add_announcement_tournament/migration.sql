-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Announcement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "delaySeconds" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER NOT NULL DEFAULT 8,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" DATETIME,
    "tournamentId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Announcement_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Announcement" ("createdAt", "delaySeconds", "durationSeconds", "expiresAt", "id", "imageUrl", "linkUrl", "status", "title", "updatedAt") SELECT "createdAt", "delaySeconds", "durationSeconds", "expiresAt", "id", "imageUrl", "linkUrl", "status", "title", "updatedAt" FROM "Announcement";
DROP TABLE "Announcement";
ALTER TABLE "new_Announcement" RENAME TO "Announcement";
CREATE INDEX "Announcement_status_createdAt_idx" ON "Announcement"("status", "createdAt");
CREATE INDEX "Announcement_tournamentId_idx" ON "Announcement"("tournamentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
