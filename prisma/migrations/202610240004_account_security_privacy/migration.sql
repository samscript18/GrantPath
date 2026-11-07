ALTER TABLE "User" ADD COLUMN "imagePublicId" TEXT;
CREATE TABLE "SecurityChallenge" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "sessionId" TEXT NOT NULL, "purpose" TEXT NOT NULL, "codeHash" TEXT NOT NULL,
 "secret" TEXT, "attempts" INTEGER NOT NULL DEFAULT 0, "emailState" TEXT NOT NULL DEFAULT 'queued',
 "sentAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3) NOT NULL, "resendAt" TIMESTAMP(3) NOT NULL,
 "usedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "SecurityChallenge_userId_purpose_createdAt_idx" ON "SecurityChallenge"("userId", "purpose", "createdAt");
CREATE TABLE "AccountExport" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "tokenHash" TEXT NOT NULL, "state" TEXT NOT NULL DEFAULT 'pending', "encryptedData" TEXT, "error" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3)
);
CREATE INDEX "AccountExport_userId_createdAt_idx" ON "AccountExport"("userId", "createdAt");
CREATE TABLE "AccountDeletion" (
 "userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "scheduledAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AccountDeletion_scheduledAt_idx" ON "AccountDeletion"("scheduledAt");
CREATE TABLE "MediaAsset" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "publicId" TEXT NOT NULL UNIQUE,
 "cloudName" TEXT NOT NULL, "state" TEXT NOT NULL DEFAULT 'pending', "cleanupAfter" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "MediaAsset_state_cleanupAfter_idx" ON "MediaAsset"("state", "cleanupAfter");
CREATE INDEX "MediaAsset_userId_idx" ON "MediaAsset"("userId");
