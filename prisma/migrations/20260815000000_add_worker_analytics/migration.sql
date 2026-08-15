-- CreateEnum
CREATE TYPE "IncomeRange" AS ENUM ('WEEK', 'MONTH', 'YEAR');

-- CreateTable
CREATE TABLE "WorkerAnalytics" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "range" "IncomeRange" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "totalEarningsBdt" INTEGER NOT NULL,
    "avgJobValueBdt" INTEGER NOT NULL,
    "jobsCompleted" INTEGER NOT NULL,
    "peakLabel" TEXT,
    "topCategoryLabel" TEXT,
    "suggestionText" TEXT,
    "demandForecastText" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkerAnalytics_workerId_range_periodStart_key"
ON "WorkerAnalytics"("workerId", "range", "periodStart");

CREATE INDEX "WorkerAnalytics_workerId_idx"
ON "WorkerAnalytics"("workerId");

-- AddForeignKey
ALTER TABLE "WorkerAnalytics"
ADD CONSTRAINT "WorkerAnalytics_workerId_fkey"
FOREIGN KEY ("workerId") REFERENCES "Worker"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
