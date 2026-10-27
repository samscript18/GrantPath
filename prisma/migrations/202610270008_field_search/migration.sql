CREATE TABLE "FieldSearchCache" (
  "key" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "leaseUntil" TIMESTAMP(3),
  "leaseToken" TEXT,
  CONSTRAINT "FieldSearchCache_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "FieldSearchCache_expiresAt_idx" ON "FieldSearchCache"("expiresAt");
