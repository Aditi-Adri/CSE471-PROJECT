-- Baseline migration for JobRequest/JobRequestStatus (Jishan's initial
-- attempt at the "no worker available -> post a request" feature).
-- This table was applied directly to the shared dev database without
-- ever being committed to git — this file exists only so this
-- migration's history entry matches what's actually in the database
-- (needed before any further migrations can apply cleanly), reproduced
-- exactly via `prisma db pull` introspection of the live table. See
-- docs/FEATURE_SPEC.md and the migration that follows this one for
-- what happens to this table next.

-- CreateEnum
CREATE TYPE "JobRequestStatus" AS ENUM ('OPEN', 'CLAIMED');

-- CreateTable
CREATE TABLE "JobRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "area" "DhakaArea" NOT NULL,
    "budgetMinBdt" INTEGER,
    "budgetMaxBdt" INTEGER,
    "status" "JobRequestStatus" NOT NULL DEFAULT 'OPEN',
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobRequest_area_idx" ON "JobRequest"("area");

-- CreateIndex
CREATE INDEX "JobRequest_status_idx" ON "JobRequest"("status");

-- AddForeignKey
ALTER TABLE "JobRequest" ADD CONSTRAINT "JobRequest_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequest" ADD CONSTRAINT "JobRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
