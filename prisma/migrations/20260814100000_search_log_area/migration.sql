-- SearchLog.area (Adri, Module 2 Feature 2: neighborhood demand
-- heatmap). Written by hand and applied via `prisma migrate resolve
-- --applied` rather than `prisma migrate dev`, same as every other
-- migration in this repo — `migrate dev`'s interactive prompt hangs in
-- a non-interactive environment.
--
-- Nullable: existing SearchLog rows predate this column, and plenty of
-- searches don't filter by area at all.

-- AlterTable
ALTER TABLE "SearchLog" ADD COLUMN "area" "DhakaArea";

-- CreateIndex
CREATE INDEX "SearchLog_area_idx" ON "SearchLog"("area");
