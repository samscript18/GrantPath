ALTER TABLE "Scholarship" ADD COLUMN "windowOpensOn" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "windowClosesOn" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "opensAt" TIMESTAMP(3);
CREATE INDEX "Scholarship_published_windowClosesOn_idx" ON "Scholarship"("published", "windowClosesOn");
