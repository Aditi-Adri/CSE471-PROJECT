ALTER TABLE "WorkerAnalytics"
ADD COLUMN IF NOT EXISTS "topCategoryLabel" TEXT;

ALTER TABLE "WorkerAnalytics"
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

UPDATE "WorkerAnalytics"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;

ALTER TABLE "WorkerAnalytics"
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "WorkerAnalytics"
ALTER COLUMN "updatedAt" SET NOT NULL;
