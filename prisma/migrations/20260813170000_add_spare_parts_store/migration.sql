-- FEATURE: Spare Parts Store — Add Item, Order, OrderItem tables
-- This migration ONLY adds new tables, does NOT modify existing tables

-- Create Item table
CREATE TABLE IF NOT EXISTS "Item" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "pictureUrl" TEXT,
  "useCase" TEXT NOT NULL,
  "price" DECIMAL(10, 2) NOT NULL,
  "stockQty" INTEGER NOT NULL DEFAULT 0,
  "workType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Order table
CREATE TABLE IF NOT EXISTS "Order" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "workerId" TEXT NOT NULL,
  "jobId" TEXT,
  "totalAmount" DECIMAL(10, 2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create OrderItem table
CREATE TABLE IF NOT EXISTS "OrderItem" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "orderId" INTEGER NOT NULL,
  "itemId" INTEGER NOT NULL,
  "itemName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(10, 2) NOT NULL,
  "subtotal" DECIMAL(10, 2) NOT NULL,
  CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE,
  CONSTRAINT "OrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Item_workType_idx" ON "Item"("workType");
CREATE INDEX IF NOT EXISTS "Item_stockQty_idx" ON "Item"("stockQty");
CREATE INDEX IF NOT EXISTS "Order_workerId_idx" ON "Order"("workerId");
CREATE INDEX IF NOT EXISTS "Order_jobId_idx" ON "Order"("jobId");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_itemId_idx" ON "OrderItem"("itemId");
