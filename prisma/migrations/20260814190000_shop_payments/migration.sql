-- MODULE 3 (Shiva): SSLCommerz payment integration for the Spare Parts
-- Shop checkout.
--
-- tranId is added nullable first and backfilled for the handful of
-- pre-existing Order rows (created before this feature existed, so
-- they never went through a payment session) before being made
-- NOT NULL + unique — a straight `NOT NULL` ADD COLUMN would fail
-- outright against a table that already has rows.

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cardType" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PAID',
ADD COLUMN     "tranId" TEXT,
ADD COLUMN     "valId" TEXT;

-- Backfill: pre-existing orders predate this feature entirely — they
-- were placed and already reflected in the job bill with no payment
-- step at all, so PAID (the default above) is the accurate status for
-- them; a synthetic tranId just satisfies the NOT NULL/unique
-- constraint being added next, it was never a real gateway session.
UPDATE "Order" SET "tranId" = 'legacy-order-' || "id" WHERE "tranId" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "tranId" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Order_tranId_key" ON "Order"("tranId");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");
