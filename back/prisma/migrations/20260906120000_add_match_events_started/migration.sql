UPDATE "Match" SET "status" = 'STARTED' WHERE "status" = 'LIVE';
CREATE TABLE "MatchEvent" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "matchId" INTEGER NOT NULL,
  "teamId" INTEGER NOT NULL,
  "playerId" INTEGER,
  "type" TEXT NOT NULL,
  "minute" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MatchEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MatchEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "MatchEvent_matchId_createdAt_idx" ON "MatchEvent"("matchId", "createdAt");
CREATE INDEX "MatchEvent_teamId_type_idx" ON "MatchEvent"("teamId", "type");
