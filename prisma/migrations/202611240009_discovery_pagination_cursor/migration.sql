-- Additive discovery state only; accepted scholarships and versions are untouched.
ALTER TABLE "DiscoveryDirectory" ADD COLUMN "continuationUrl" TEXT;
