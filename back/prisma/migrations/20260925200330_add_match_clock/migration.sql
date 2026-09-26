-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournamentId" INTEGER NOT NULL,
    "homeTeamId" INTEGER NOT NULL,
    "awayTeamId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "time" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "streamUrl" TEXT,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "homePenaltyScore" INTEGER,
    "awayPenaltyScore" INTEGER,
    "halfDurationMinutes" INTEGER,
    "currentPeriod" INTEGER,
    "periodStartedAt" DATETIME,
    "extraMinutes" INTEGER NOT NULL DEFAULT 0,
    "stage" TEXT,
    "groupId" INTEGER,
    "tieId" INTEGER,
    "leg" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_tieId_fkey" FOREIGN KEY ("tieId") REFERENCES "KnockoutTie" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("awayPenaltyScore", "awayScore", "awayTeamId", "createdAt", "date", "groupId", "homePenaltyScore", "homeScore", "homeTeamId", "id", "leg", "stage", "status", "streamUrl", "tieId", "time", "tournamentId", "updatedAt") SELECT "awayPenaltyScore", "awayScore", "awayTeamId", "createdAt", "date", "groupId", "homePenaltyScore", "homeScore", "homeTeamId", "id", "leg", "stage", "status", "streamUrl", "tieId", "time", "tournamentId", "updatedAt" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE INDEX "Match_tournamentId_date_time_idx" ON "Match"("tournamentId", "date", "time");
CREATE INDEX "Match_status_idx" ON "Match"("status");
CREATE INDEX "Match_groupId_idx" ON "Match"("groupId");
CREATE INDEX "Match_tieId_idx" ON "Match"("tieId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
