-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_workerId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_itemId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "WorkerJob" DROP CONSTRAINT "WorkerJob_categoryId_fkey";

-- DropIndex
DROP INDEX "WorkerAnalytics_workerId_range_periodStart_idx";

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WorkerAnalytics" DROP COLUMN "range",
ADD COLUMN     "range" "IncomeRange" NOT NULL,
ALTER COLUMN "peakLabel" DROP NOT NULL,
ALTER COLUMN "suggestionText" DROP NOT NULL,
ALTER COLUMN "demandForecastText" DROP NOT NULL,
DROP COLUMN "source",
ADD COLUMN     "source" TEXT NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WorkerJob" ALTER COLUMN "categoryId" DROP NOT NULL;

-- DropEnum
DROP TYPE "AnalyticsRange";

-- DropEnum
DROP TYPE "AnalyticsSource";

-- CreateIndex
CREATE INDEX "WorkerAnalytics_workerId_idx" ON "WorkerAnalytics"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerAnalytics_workerId_range_periodStart_key" ON "WorkerAnalytics"("workerId", "range", "periodStart");

-- CreateIndex
CREATE INDEX "WorkerJob_workerId_idx" ON "WorkerJob"("workerId");

-- AddForeignKey
ALTER TABLE "WorkerJob" ADD CONSTRAINT "WorkerJob_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

