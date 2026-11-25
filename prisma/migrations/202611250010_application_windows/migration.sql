ALTER TABLE "Scholarship" ADD COLUMN "windowKind" TEXT NOT NULL DEFAULT 'unknown';
CREATE INDEX "Scholarship_published_windowKind_idx" ON "Scholarship"("published", "windowKind");
