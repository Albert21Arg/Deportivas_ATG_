-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN "expiresAt" DATETIME;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "logoExpiresAt" DATETIME;
ALTER TABLE "Team" ADD COLUMN "paidUntil" DATETIME;

-- CreateTable
CREATE TABLE "TableCaption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournamentId" INTEGER NOT NULL,
    "tableKey" TEXT NOT NULL,
    "text" TEXT,
    "expiresAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TableCaption_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Group" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournamentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Group_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupTeam" (
    "groupId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "pot" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("groupId", "teamId"),
    CONSTRAINT "GroupTeam_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnockoutTie" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournamentId" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "homeTeamId" INTEGER,
    "awayTeamId" INTEGER,
    "winnerTeamId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KnockoutTie_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KnockoutTie_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KnockoutTie_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KnockoutTie_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

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
    "homeScore" INTEGER,
    "awayScore" INTEGER,
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
INSERT INTO "new_Match" ("awayScore", "awayTeamId", "createdAt", "date", "homeScore", "homeTeamId", "id", "status", "time", "tournamentId", "updatedAt") SELECT "awayScore", "awayTeamId", "createdAt", "date", "homeScore", "homeTeamId", "id", "status", "time", "tournamentId", "updatedAt" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE INDEX "Match_tournamentId_date_time_idx" ON "Match"("tournamentId", "date", "time");
CREATE INDEX "Match_status_idx" ON "Match"("status");
CREATE INDEX "Match_groupId_idx" ON "Match"("groupId");
CREATE INDEX "Match_tieId_idx" ON "Match"("tieId");
CREATE TABLE "new_Tournament" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
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
INSERT INTO "new_Tournament" ("createdAt", "description", "id", "name", "status", "updatedAt") SELECT "createdAt", "description", "id", "name", "status", "updatedAt" FROM "Tournament";
DROP TABLE "Tournament";
ALTER TABLE "new_Tournament" RENAME TO "Tournament";
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TableCaption_tournamentId_tableKey_key" ON "TableCaption"("tournamentId", "tableKey");

-- CreateIndex
CREATE INDEX "Group_tournamentId_idx" ON "Group"("tournamentId");

-- CreateIndex
CREATE INDEX "GroupTeam_teamId_idx" ON "GroupTeam"("teamId");

-- CreateIndex
CREATE INDEX "KnockoutTie_tournamentId_stage_idx" ON "KnockoutTie"("tournamentId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "KnockoutTie_tournamentId_stage_slot_key" ON "KnockoutTie"("tournamentId", "stage", "slot");
