ALTER TABLE "User" ADD COLUMN "authMethod" TEXT NOT NULL DEFAULT 'email';
UPDATE "User" AS u SET "authMethod" = CASE WHEN (
  SELECT a."providerId" FROM "Account" AS a WHERE a."userId" = u.id
  ORDER BY a."createdAt", a.id LIMIT 1
) = 'google' THEN 'google' ELSE 'email' END;
ALTER TABLE "User" ADD CONSTRAINT "User_authMethod_check" CHECK ("authMethod" IN ('email', 'google'));
CREATE TABLE "VerificationCooldown" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "nextAllowedAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
