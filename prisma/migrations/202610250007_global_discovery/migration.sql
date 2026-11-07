ALTER TABLE "Provider" ADD COLUMN "countryCode" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "destinationCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], ADD COLUMN "destinationScope" TEXT NOT NULL DEFAULT 'unconfirmed';
UPDATE "Scholarship" SET "destinationCodes" = ARRAY[CASE "destination" WHEN 'United Kingdom' THEN 'GB' WHEN 'Australia' THEN 'AU' WHEN 'Switzerland' THEN 'CH' WHEN 'Netherlands' THEN 'NL' END], "destinationScope" = 'single' WHERE "destination" IN ('United Kingdom', 'Australia', 'Switzerland', 'Netherlands');
CREATE INDEX "Scholarship_destinationCodes_idx" ON "Scholarship" USING GIN ("destinationCodes");
-- CreateTable
CREATE TABLE "DiscoveryDirectory" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "adapter" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "policyVersion" INTEGER NOT NULL DEFAULT 1,
    "policyReason" TEXT NOT NULL,
    "cadenceHours" INTEGER NOT NULL DEFAULT 24,
    "health" TEXT NOT NULL DEFAULT 'policy_review',
    "lastAttemptAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "leaseToken" TEXT,

    CONSTRAINT "DiscoveryDirectory_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "DirectoryCheck" (
    "id" TEXT NOT NULL,
    "directoryId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "succeededAt" TIMESTAMP(3),
    "state" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "error" TEXT,
    "discoveredCount" INTEGER NOT NULL DEFAULT 0,
    "hash" TEXT,

    CONSTRAINT "DirectoryCheck_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "DiscoveredCandidate" (
    "id" TEXT NOT NULL,
    "directoryId" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "discoveredFrom" TEXT NOT NULL,
    "firstDiscoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDiscoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "leaseToken" TEXT,
    "error" TEXT,
    "scholarshipId" TEXT,

    CONSTRAINT "DiscoveredCandidate_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "DiscoveryObservation" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "contentHash" TEXT NOT NULL,
    "adapterVersion" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "data" JSONB,
    "validation" JSONB NOT NULL,
    "excerpt" TEXT NOT NULL,
    "controlled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DiscoveryObservation_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "PublicationDecision" (
    "id" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reasonCodes" TEXT[],
    "policyVersion" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "scholarshipId" TEXT,
    "baseVersion" INTEGER NOT NULL DEFAULT 0,
    "resultingVersion" INTEGER,
    "eventIds" TEXT[],
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationDecision_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryDirectory_url_key" ON "DiscoveryDirectory"("url");
-- CreateIndex
CREATE INDEX "DirectoryCheck_directoryId_attemptedAt_idx" ON "DirectoryCheck"("directoryId", "attemptedAt");
-- CreateIndex
CREATE INDEX "DiscoveredCandidate_state_nextAttemptAt_idx" ON "DiscoveredCandidate"("state", "nextAttemptAt");
-- CreateIndex
CREATE UNIQUE INDEX "DiscoveredCandidate_directoryId_canonicalUrl_key" ON "DiscoveredCandidate"("directoryId", "canonicalUrl");
-- CreateIndex
CREATE INDEX "DiscoveryObservation_candidateId_retrievedAt_idx" ON "DiscoveryObservation"("candidateId", "retrievedAt");
-- CreateIndex
CREATE UNIQUE INDEX "PublicationDecision_observationId_key" ON "PublicationDecision"("observationId");
-- CreateIndex
CREATE INDEX "PublicationDecision_decision_createdAt_idx" ON "PublicationDecision"("decision", "createdAt");
-- AddForeignKey
ALTER TABLE "DirectoryCheck" ADD CONSTRAINT "DirectoryCheck_directoryId_fkey" FOREIGN KEY ("directoryId") REFERENCES "DiscoveryDirectory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "DiscoveredCandidate" ADD CONSTRAINT "DiscoveredCandidate_directoryId_fkey" FOREIGN KEY ("directoryId") REFERENCES "DiscoveryDirectory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "DiscoveryObservation" ADD CONSTRAINT "DiscoveryObservation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "DiscoveredCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "PublicationDecision" ADD CONSTRAINT "PublicationDecision_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "DiscoveryObservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
