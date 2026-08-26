-- MODULE 3 -> Worker Subscription & Working Radius (new feature).
--
-- 100% additive — no existing column, table, or row is touched or
-- dropped. Safe to run with `npx prisma migrate dev` (or
-- `npm run db:migrate`) against a live database with existing data.
-- Every new Worker column has a DEFAULT, so every existing worker row
-- just gets filled in with the free Basic plan automatically.

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM', 'UNLIMITED');

-- AlterTable: add the 4 new subscription/radius columns to the existing Worker table
ALTER TABLE "Worker" ADD COLUMN "serviceRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 2;
ALTER TABLE "Worker" ADD COLUMN "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'BASIC';
ALTER TABLE "Worker" ADD COLUMN "subscriptionExpiresAt" TIMESTAMP(3);
ALTER TABLE "Worker" ADD COLUMN "subscriptionTrialUsed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: brand-new table, shaped like "Order" (same PaymentStatus enum + SSLCommerz columns)
CREATE TABLE "SubscriptionOrder" (
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

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionOrder_tranId_key" ON "SubscriptionOrder"("tranId");

-- CreateIndex
CREATE INDEX "SubscriptionOrder_workerId_idx" ON "SubscriptionOrder"("workerId");

-- CreateIndex
CREATE INDEX "SubscriptionOrder_paymentStatus_idx" ON "SubscriptionOrder"("paymentStatus");

-- AddForeignKey
ALTER TABLE "SubscriptionOrder" ADD CONSTRAINT "SubscriptionOrder_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
