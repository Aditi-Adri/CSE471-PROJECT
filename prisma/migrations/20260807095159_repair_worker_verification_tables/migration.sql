-- Repair drift on the shared database.
--
-- Migration 20260807055649_worker_verification_badges created these four
-- tables correctly and Prisma's own migration history (_prisma_migrations)
-- still shows it as applied. Sometime after that, something modified the
-- live database directly outside of Prisma Migrate — most likely `prisma
-- db push` run against this shared DB from a machine whose local
-- schema.prisma didn't have these models yet, which silently reconciles
-- the live database to match whatever schema is on hand and does NOT
-- record anything in _prisma_migrations. That's why `prisma migrate
-- status` still reported "up to date" even though the actual table
-- shapes had diverged: DROP TABLE isn't something migration-history
-- tracking can detect after the fact.
--
-- Net effect found in the database: Tier2SkillTest, Tier3PoliceClearance
-- and WorkerReference were dropped entirely, Tier1Verification was
-- reduced to a bare (id, workerId, createdAt, updatedAt, status) shape,
-- and the TierReviewStatus enum type was dropped too. The one row left
-- in the malformed Tier1Verification table had status/updatedAt = NULL —
-- a write that only partially succeeded against the wrong shape, not
-- usable data — so it's safe to drop and rebuild rather than migrate.
--
-- This recreates exactly what 20260807055649_worker_verification_badges
-- originally created, and is recorded as its own migration so
-- `prisma migrate deploy` applies it cleanly on every machine (including
-- whichever one caused the drift) instead of silently disagreeing again.

DROP TABLE IF EXISTS "WorkerReference";
DROP TABLE IF EXISTS "Tier1Verification";
DROP TABLE IF EXISTS "Tier2SkillTest";
DROP TABLE IF EXISTS "Tier3PoliceClearance";
DROP TYPE IF EXISTS "TierReviewStatus";

-- CreateEnum
CREATE TYPE "TierReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Tier1Verification" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "nidImage" TEXT NOT NULL,
    "selfieImage" TEXT NOT NULL,
    "matchDistance" DOUBLE PRECISION,
    "autoApproved" BOOLEAN NOT NULL DEFAULT false,
    "status" "TierReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Tier1Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tier2SkillTest" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "preferredSchedule" TEXT,
    "status" "TierReviewStatus" NOT NULL DEFAULT 'PENDING',
    "evaluatedById" TEXT,
    "evaluatorNote" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluatedAt" TIMESTAMP(3),

    CONSTRAINT "Tier2SkillTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tier3PoliceClearance" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "clearanceDocument" TEXT NOT NULL,
    "status" "TierReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Tier3PoliceClearance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerReference" (
    "id" TEXT NOT NULL,
    "tier3Id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,

    CONSTRAINT "WorkerReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tier1Verification_workerId_key" ON "Tier1Verification"("workerId");

-- CreateIndex
CREATE INDEX "Tier1Verification_status_idx" ON "Tier1Verification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Tier2SkillTest_workerId_key" ON "Tier2SkillTest"("workerId");

-- CreateIndex
CREATE INDEX "Tier2SkillTest_status_idx" ON "Tier2SkillTest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Tier3PoliceClearance_workerId_key" ON "Tier3PoliceClearance"("workerId");

-- CreateIndex
CREATE INDEX "Tier3PoliceClearance_status_idx" ON "Tier3PoliceClearance"("status");

-- CreateIndex
CREATE INDEX "WorkerReference_tier3Id_idx" ON "WorkerReference"("tier3Id");

-- AddForeignKey
ALTER TABLE "Tier1Verification" ADD CONSTRAINT "Tier1Verification_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tier1Verification" ADD CONSTRAINT "Tier1Verification_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tier2SkillTest" ADD CONSTRAINT "Tier2SkillTest_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tier2SkillTest" ADD CONSTRAINT "Tier2SkillTest_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tier3PoliceClearance" ADD CONSTRAINT "Tier3PoliceClearance_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tier3PoliceClearance" ADD CONSTRAINT "Tier3PoliceClearance_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerReference" ADD CONSTRAINT "WorkerReference_tier3Id_fkey" FOREIGN KEY ("tier3Id") REFERENCES "Tier3PoliceClearance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
