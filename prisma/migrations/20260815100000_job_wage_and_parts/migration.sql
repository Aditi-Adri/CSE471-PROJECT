-- Adri, Module 3: wage on job applications + spare parts billing.
-- Written by hand and applied via `prisma migrate resolve --applied`,
-- same as every other migration in this repo (migrate dev's prompt
-- hangs in this non-interactive setup).

-- JobRequestApplication gets a wage. 4 rows already existed, so add
-- it with a temporary default to satisfy them, then drop the default
-- so every new row has to supply a real one.
ALTER TABLE "JobRequestApplication" ADD COLUMN "wageBdt" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "JobRequestApplication" ALTER COLUMN "wageBdt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "stockQty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartOrder" (
    "id" TEXT NOT NULL,
    "jobRequestId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartOrderItem" (
    "id" TEXT NOT NULL,
    "partOrderId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "PartOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartOrder_jobRequestId_idx" ON "PartOrder"("jobRequestId");

-- CreateIndex
CREATE INDEX "PartOrderItem_partOrderId_idx" ON "PartOrderItem"("partOrderId");

-- AddForeignKey
ALTER TABLE "PartOrder" ADD CONSTRAINT "PartOrder_jobRequestId_fkey" FOREIGN KEY ("jobRequestId") REFERENCES "JobRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartOrder" ADD CONSTRAINT "PartOrder_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartOrderItem" ADD CONSTRAINT "PartOrderItem_partOrderId_fkey" FOREIGN KEY ("partOrderId") REFERENCES "PartOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartOrderItem" ADD CONSTRAINT "PartOrderItem_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
