-- DropIndex
DROP INDEX "TournamentView_tournamentId_createdAt_idx";

-- AlterTable
ALTER TABLE "TournamentView" ADD COLUMN "ipAddress" TEXT;

-- CreateIndex
CREATE INDEX "TournamentView_tournamentId_ipAddress_createdAt_idx" ON "TournamentView"("tournamentId", "ipAddress", "createdAt");
