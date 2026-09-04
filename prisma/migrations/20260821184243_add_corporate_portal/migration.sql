-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_workerId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_itemId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "corporatePropertyId" TEXT,
ADD COLUMN     "isCorporateBill" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requestedByRole" TEXT;

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "CorporateProperty" (
    "id" TEXT NOT NULL,
    "corporateUserId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "area" "DhakaArea" NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateProperty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorporateProperty_corporateUserId_idx" ON "CorporateProperty"("corporateUserId");

-- CreateIndex
CREATE INDEX "Booking_isCorporateBill_idx" ON "Booking"("isCorporateBill");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateProperty" ADD CONSTRAINT "CorporateProperty_corporateUserId_fkey" FOREIGN KEY ("corporateUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
