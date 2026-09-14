-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlayerTeam" (
    "playerId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "isGoalkeeper" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("playerId", "teamId"),
    CONSTRAINT "PlayerTeam_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlayerTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PlayerTeam" ("createdAt", "playerId", "teamId") SELECT "createdAt", "playerId", "teamId" FROM "PlayerTeam";
DROP TABLE "PlayerTeam";
ALTER TABLE "new_PlayerTeam" RENAME TO "PlayerTeam";
CREATE INDEX "PlayerTeam_teamId_idx" ON "PlayerTeam"("teamId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
