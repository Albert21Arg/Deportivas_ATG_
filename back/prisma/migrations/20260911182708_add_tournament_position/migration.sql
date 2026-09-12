-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tournament" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" DATETIME,
    "position" INTEGER NOT NULL DEFAULT 0,
    "mode" TEXT NOT NULL DEFAULT 'ROUND_ROBIN',
    "hasThirdPlace" BOOLEAN NOT NULL DEFAULT false,
    "blueCardEnabled" BOOLEAN NOT NULL DEFAULT true,
    "awayGoalsRule" BOOLEAN NOT NULL DEFAULT false,
    "championTeamId" INTEGER,
    "runnerUpTeamId" INTEGER,
    "thirdPlaceTeamId" INTEGER,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tournament_championTeamId_fkey" FOREIGN KEY ("championTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tournament_runnerUpTeamId_fkey" FOREIGN KEY ("runnerUpTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tournament_thirdPlaceTeamId_fkey" FOREIGN KEY ("thirdPlaceTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tournament" ("awayGoalsRule", "blueCardEnabled", "championTeamId", "createdAt", "description", "expiresAt", "finishedAt", "hasThirdPlace", "id", "logo", "mode", "name", "runnerUpTeamId", "status", "thirdPlaceTeamId", "updatedAt") SELECT "awayGoalsRule", "blueCardEnabled", "championTeamId", "createdAt", "description", "expiresAt", "finishedAt", "hasThirdPlace", "id", "logo", "mode", "name", "runnerUpTeamId", "status", "thirdPlaceTeamId", "updatedAt" FROM "Tournament";
DROP TABLE "Tournament";
ALTER TABLE "new_Tournament" RENAME TO "Tournament";
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");
CREATE INDEX "Tournament_position_idx" ON "Tournament"("position");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
