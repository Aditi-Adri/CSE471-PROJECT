-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'WORKER', 'CORPORATE', 'ADMIN');

-- CreateEnum
CREATE TYPE "VerificationTier" AS ENUM ('UNVERIFIED', 'TIER1_ID_VERIFIED', 'TIER2_SKILL_TESTED', 'TIER3_POLICE_CLEARED');

-- CreateEnum
CREATE TYPE "DhakaArea" AS ENUM ('GULSHAN', 'BANANI', 'BARIDHARA', 'DHANMONDI', 'UTTARA', 'MIRPUR', 'MOHAMMADPUR', 'BASHUNDHARA', 'BADDA', 'RAMPURA', 'MOTIJHEEL', 'OLD_DHAKA', 'WARI', 'LALMATIA', 'FARMGATE', 'TEJGAON', 'KHILGAON', 'MALIBAGH', 'JATRABARI', 'MOHAKHALI', 'BANASREE', 'SAVAR');

-- CreateEnum
CREATE TYPE "MatchMethod" AS ENUM ('KEYWORD', 'AI', 'MANUAL_FILTER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "keywords" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "area" "DhakaArea" NOT NULL,
    "addressDetail" TEXT NOT NULL,
    "hourlyRateMinBdt" INTEGER NOT NULL,
    "hourlyRateMaxBdt" INTEGER NOT NULL,
    "verificationTier" "VerificationTier" NOT NULL DEFAULT 'UNVERIFIED',
    "yearsExperience" INTEGER NOT NULL DEFAULT 0,
    "isAvailableNow" BOOLEAN NOT NULL DEFAULT true,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "completedJobs" INTEGER NOT NULL DEFAULT 0,
    "avatarSeed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerCategory" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkerCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startHour" INTEGER NOT NULL,
    "endHour" INTEGER NOT NULL,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchLog" (
    "id" TEXT NOT NULL,
    "queryText" TEXT NOT NULL,
    "detectedCategoryId" TEXT,
    "matchMethod" "MatchMethod" NOT NULL,
    "matchConfidence" DOUBLE PRECISION,
    "resultCount" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_name_key" ON "ServiceCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");

-- CreateIndex
CREATE INDEX "ServiceCategory_slug_idx" ON "ServiceCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_userId_key" ON "Worker"("userId");

-- CreateIndex
CREATE INDEX "Worker_area_idx" ON "Worker"("area");

-- CreateIndex
CREATE INDEX "Worker_verificationTier_idx" ON "Worker"("verificationTier");

-- CreateIndex
CREATE INDEX "Worker_isAvailableNow_idx" ON "Worker"("isAvailableNow");

-- CreateIndex
CREATE INDEX "Worker_hourlyRateMinBdt_hourlyRateMaxBdt_idx" ON "Worker"("hourlyRateMinBdt", "hourlyRateMaxBdt");

-- CreateIndex
CREATE INDEX "WorkerCategory_categoryId_idx" ON "WorkerCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerCategory_workerId_categoryId_key" ON "WorkerCategory"("workerId", "categoryId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_workerId_idx" ON "AvailabilitySlot"("workerId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_dayOfWeek_idx" ON "AvailabilitySlot"("dayOfWeek");

-- CreateIndex
CREATE INDEX "SearchLog_createdAt_idx" ON "SearchLog"("createdAt");

-- CreateIndex
CREATE INDEX "SearchLog_detectedCategoryId_idx" ON "SearchLog"("detectedCategoryId");

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerCategory" ADD CONSTRAINT "WorkerCategory_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerCategory" ADD CONSTRAINT "WorkerCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
