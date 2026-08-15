-- Job Requests: multi-applicant apply/hire flow (Adri).
--
-- Written by hand and applied via `prisma migrate resolve --applied`
-- rather than `prisma migrate dev`, following the same convention
-- already used for 20260807154953_tracking_and_sos and
-- 20260813150000_real_tracking_and_sos in this repo: `migrate dev`'s
-- interactive drift-resolution prompt hangs in a non-interactive
-- environment, and at the time this was written the shared DB also had
-- 20260813150000_real_tracking_and_sos applied ahead of any local
-- migration folder for it, so a diff-based `migrate dev` would have
-- tried to revert those tracking columns. This migration is scoped
-- strictly to JobRequest/JobRequestApplication/Worker's job-request
-- back-relations — it does not touch anything tracking/SOS-related.
--
-- Previously: JobRequest had a single-claim model (status OPEN/CLAIMED,
-- claimedById/claimedAt). Now: any number of workers can apply
-- (JobRequestApplication, one row per worker per request), and the
-- customer hires exactly one via hiredWorkerId/hiredAt, flipping status
-- to HIRED. Existing 'CLAIMED' rows (if any) become 'HIRED' via
-- RENAME VALUE, which preserves data instead of requiring a backfill.

-- RenameEnumValue
ALTER TYPE "JobRequestStatus" RENAME VALUE 'CLAIMED' TO 'HIRED';

-- RenameColumns (claimedById/claimedAt -> hiredWorkerId/hiredAt)
ALTER TABLE "JobRequest" RENAME COLUMN "claimedById" TO "hiredWorkerId";
ALTER TABLE "JobRequest" RENAME COLUMN "claimedAt" TO "hiredAt";
ALTER TABLE "JobRequest" RENAME CONSTRAINT "JobRequest_claimedById_fkey" TO "JobRequest_hiredWorkerId_fkey";

-- CreateTable
CREATE TABLE "JobRequestApplication" (
    "id" TEXT NOT NULL,
    "jobRequestId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRequestApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobRequestApplication_jobRequestId_workerId_key" ON "JobRequestApplication"("jobRequestId", "workerId");

-- CreateIndex
CREATE INDEX "JobRequestApplication_jobRequestId_idx" ON "JobRequestApplication"("jobRequestId");

-- CreateIndex
CREATE INDEX "JobRequestApplication_workerId_idx" ON "JobRequestApplication"("workerId");

-- AddForeignKey
ALTER TABLE "JobRequestApplication" ADD CONSTRAINT "JobRequestApplication_jobRequestId_fkey" FOREIGN KEY ("jobRequestId") REFERENCES "JobRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequestApplication" ADD CONSTRAINT "JobRequestApplication_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
