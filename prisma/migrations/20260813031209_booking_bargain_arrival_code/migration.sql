-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BookingStatus" ADD VALUE 'PENDING_ACCEPTANCE';
ALTER TYPE "BookingStatus" ADD VALUE 'CONFIRMED';
ALTER TYPE "BookingStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "agreedRateBdt" INTEGER,
ADD COLUMN     "arrivalCode" TEXT,
ADD COLUMN     "arrivalVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "counterRateBdt" INTEGER,
ADD COLUMN     "proposedRateBdt" INTEGER,
ADD COLUMN     "serviceAddress" TEXT;
