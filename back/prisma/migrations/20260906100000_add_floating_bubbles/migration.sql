-- CreateTable
CREATE TABLE "FloatingBubble" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'MessageCircle',
    "logoUrl" TEXT,
    "color" TEXT NOT NULL DEFAULT 'emerald',
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "FloatingBubble_key_key" ON "FloatingBubble"("key");

-- CreateIndex
CREATE INDEX "FloatingBubble_status_position_idx" ON "FloatingBubble"("status", "position");

-- Default actions shown until a SuperAdmin customizes them.
INSERT INTO "FloatingBubble" ("key", "label", "linkUrl", "icon", "color", "position", "status", "updatedAt") VALUES
  ('whatsapp', 'WhatsApp', '#', 'MessageCircle', 'emerald', 0, 'ACTIVE', CURRENT_TIMESTAMP),
  ('comita', 'Comita', '#', 'MessageSquareQuote', 'cyan', 1, 'ACTIVE', CURRENT_TIMESTAMP),
  ('cerveza', 'Cerveza', '#', 'Beer', 'amber', 2, 'ACTIVE', CURRENT_TIMESTAMP);
