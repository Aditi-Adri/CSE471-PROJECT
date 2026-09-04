-- HEALING MIGRATION — repairs schema drift.
--
-- What happened: Prisma's own history table (_prisma_migrations) says migration
-- "20260820120000_worker_subscription_radius" already applied successfully, but the
-- real database is missing everything it was supposed to create (the SubscriptionTier
-- type, the 4 new Worker columns, and the SubscriptionOrder table). That mismatch is
-- why the app throws "column Worker.serviceRadiusKm does not exist".
--
-- This file re-does exactly what that original migration did, but every statement is
-- written so it's safe to run even if some/none/all of it already exists. Nothing here
-- touches or deletes any existing data — it only creates things if they're missing.
--
-- Filename starts with 20260820180000 so it sorts AFTER 20260820120000 (the original
-- migration this heals) and BEFORE 20260821090000 (the "starter plan" migration that
-- adds the STARTER tier value and changes the default radius to 1km). That migration
-- will be retried right after this one applies successfully.

-- 1) Create the SubscriptionTier enum type, only if it doesn't already exist.
--    Plain PostgreSQL has no "CREATE TYPE IF NOT EXISTS", so we check the system
--    catalog (pg_type) ourselves inside a DO block.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionTier') THEN
    CREATE TYPE "SubscriptionTier" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM', 'UNLIMITED');
  END IF;
END
$$;

-- 2) Add the 4 subscription/radius columns to the existing Worker table.
--    "ADD COLUMN IF NOT EXISTS" is natively supported by PostgreSQL, so no DO block
--    is needed here — each line is already safe to re-run.
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "serviceRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 2;
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'BASIC';
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "subscriptionExpiresAt" TIMESTAMP(3);
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "subscriptionTrialUsed" BOOLEAN NOT NULL DEFAULT false;

-- 3) Re-create the SubscriptionOrder table, only if it doesn't already exist.
CREATE TABLE IF NOT EXISTS "SubscriptionOrder" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "plan" "SubscriptionTier" NOT NULL,
    "amountBdt" INTEGER NOT NULL,
    "isTrial" BOOLEAN NOT NULL DEFAULT false,
    "durationDays" INTEGER NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "tranId" TEXT NOT NULL,
    "valId" TEXT,
    "cardType" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionOrder_pkey" PRIMARY KEY ("id")
);

-- 4) Re-create its indexes, only if missing.
CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionOrder_tranId_key" ON "SubscriptionOrder"("tranId");
CREATE INDEX IF NOT EXISTS "SubscriptionOrder_workerId_idx" ON "SubscriptionOrder"("workerId");
CREATE INDEX IF NOT EXISTS "SubscriptionOrder_paymentStatus_idx" ON "SubscriptionOrder"("paymentStatus");

-- 5) Re-create the foreign key from SubscriptionOrder.workerId -> Worker.id, only if
--    it doesn't already exist. PostgreSQL has no "ADD CONSTRAINT IF NOT EXISTS", so we
--    check the system catalog (pg_constraint) ourselves inside a DO block.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SubscriptionOrder_workerId_fkey'
  ) THEN
    ALTER TABLE "SubscriptionOrder"
      ADD CONSTRAINT "SubscriptionOrder_workerId_fkey"
      FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
