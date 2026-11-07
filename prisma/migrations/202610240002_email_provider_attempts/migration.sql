-- Preserve provider identity across retries and email-provider changes.
ALTER TABLE "DeliveryAttempt" ADD COLUMN "provider" TEXT;
ALTER TABLE "DeliveryAttempt" ADD COLUMN "providerKey" TEXT;
