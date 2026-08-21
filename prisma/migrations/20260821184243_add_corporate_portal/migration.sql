-- DropForeignKey
ALTER TABLE "CaretakerPermission" DROP CONSTRAINT "CaretakerPermission_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_resolvedById_fkey";

-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_workerId_fkey";

-- DropForeignKey
ALTER TABLE "CorporateBillingCycle" DROP CONSTRAINT "CorporateBillingCycle_corporateAccountId_fkey";

-- DropForeignKey
ALTER TABLE "CorporateProperty" DROP CONSTRAINT "CorporateProperty_corporateAccountId_fkey";

-- DropForeignKey
ALTER TABLE "CorporateServiceLog" DROP CONSTRAINT "CorporateServiceLog_billingCycleId_fkey";

-- DropForeignKey
ALTER TABLE "CorporateServiceLog" DROP CONSTRAINT "CorporateServiceLog_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "CorporateServiceLog" DROP CONSTRAINT "CorporateServiceLog_scheduleId_fkey";

-- DropForeignKey
ALTER TABLE "Coupon" DROP CONSTRAINT "Coupon_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Coupon" DROP CONSTRAINT "Coupon_issuedToUserId_fkey";

-- DropForeignKey
ALTER TABLE "CouponRedemption" DROP CONSTRAINT "CouponRedemption_couponId_fkey";

-- DropForeignKey
ALTER TABLE "CouponRedemption" DROP CONSTRAINT "CouponRedemption_orderId_fkey";

-- DropForeignKey
ALTER TABLE "CouponRedemption" DROP CONSTRAINT "CouponRedemption_userId_fkey";

-- DropForeignKey
ALTER TABLE "Favorite" DROP CONSTRAINT "Favorite_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Favorite" DROP CONSTRAINT "Favorite_workerId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_workerId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_itemId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "PartOrder" DROP CONSTRAINT "PartOrder_jobRequestId_fkey";

-- DropForeignKey
ALTER TABLE "PartOrder" DROP CONSTRAINT "PartOrder_workerId_fkey";

-- DropForeignKey
ALTER TABLE "PartOrderItem" DROP CONSTRAINT "PartOrderItem_partId_fkey";

-- DropForeignKey
ALTER TABLE "PartOrderItem" DROP CONSTRAINT "PartOrderItem_partOrderId_fkey";

-- DropForeignKey
ALTER TABLE "RecurringCheckSchedule" DROP CONSTRAINT "RecurringCheckSchedule_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "SubscriptionOrder" DROP CONSTRAINT "SubscriptionOrder_workerId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_referredById_fkey";

-- DropForeignKey
ALTER TABLE "WorkerAnalytics" DROP CONSTRAINT "WorkerAnalytics_workerId_fkey";

-- DropForeignKey
ALTER TABLE "WorkerJob" DROP CONSTRAINT "WorkerJob_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "WorkerJob" DROP CONSTRAINT "WorkerJob_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "WorkerJob" DROP CONSTRAINT "WorkerJob_workerId_fkey";

-- DropForeignKey
ALTER TABLE "Workshop" DROP CONSTRAINT "Workshop_createdById_fkey";

-- DropForeignKey
ALTER TABLE "WorkshopRegistration" DROP CONSTRAINT "WorkshopRegistration_userId_fkey";

-- DropForeignKey
ALTER TABLE "WorkshopRegistration" DROP CONSTRAINT "WorkshopRegistration_workshopId_fkey";

-- DropIndex
DROP INDEX "CorporateProperty_area_idx";

-- DropIndex
DROP INDEX "CorporateProperty_corporateAccountId_idx";

-- DropIndex
DROP INDEX "User_referralCode_key";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "corporatePropertyId" TEXT,
ADD COLUMN     "isCorporateBill" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requestedByRole" TEXT;

-- AlterTable
ALTER TABLE "CorporateProperty" DROP COLUMN "addressDetail",
DROP COLUMN "corporateAccountId",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "corporateUserId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "JobRequestApplication" DROP COLUMN "wageBdt";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "discountBdt";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "referralCode",
DROP COLUMN "referredById";

-- AlterTable
ALTER TABLE "Worker" DROP COLUMN "serviceRadiusKm",
DROP COLUMN "subscriptionExpiresAt",
DROP COLUMN "subscriptionTier",
DROP COLUMN "subscriptionTrialUsed";

-- DropTable
DROP TABLE "CaretakerPermission";

-- DropTable
DROP TABLE "Complaint";

-- DropTable
DROP TABLE "CorporateAccount";

-- DropTable
DROP TABLE "CorporateBillingCycle";

-- DropTable
DROP TABLE "CorporateServiceLog";

-- DropTable
DROP TABLE "Coupon";

-- DropTable
DROP TABLE "CouponRedemption";

-- DropTable
DROP TABLE "Favorite";

-- DropTable
DROP TABLE "Part";

-- DropTable
DROP TABLE "PartOrder";

-- DropTable
DROP TABLE "PartOrderItem";

-- DropTable
DROP TABLE "RecurringCheckSchedule";

-- DropTable
DROP TABLE "SubscriptionOrder";

-- DropTable
DROP TABLE "WorkerAnalytics";

-- DropTable
DROP TABLE "WorkerJob";

-- DropTable
DROP TABLE "Workshop";

-- DropTable
DROP TABLE "WorkshopRegistration";

-- DropEnum
DROP TYPE "AnalyticsSource";

-- DropEnum
DROP TYPE "CaretakerAccessLevel";

-- DropEnum
DROP TYPE "ComplaintStatus";

-- DropEnum
DROP TYPE "CorporateBillingStatus";

-- DropEnum
DROP TYPE "CouponDiscountType";

-- DropEnum
DROP TYPE "CouponSource";

-- DropEnum
DROP TYPE "IncomeRange";

-- DropEnum
DROP TYPE "RecurringCheckFrequency";

-- DropEnum
DROP TYPE "SubscriptionTier";

-- CreateIndex
CREATE INDEX "Booking_isCorporateBill_idx" ON "Booking"("isCorporateBill");

-- CreateIndex
CREATE INDEX "CorporateProperty_corporateUserId_idx" ON "CorporateProperty"("corporateUserId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateProperty" ADD CONSTRAINT "CorporateProperty_corporateUserId_fkey" FOREIGN KEY ("corporateUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

