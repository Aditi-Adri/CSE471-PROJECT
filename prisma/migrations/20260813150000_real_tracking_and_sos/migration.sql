-- Rebuild of Live Tracking & SOS (Module 1, Feature 3, Jishan) onto real
-- data instead of the old disconnected demo. Written by hand rather than
-- via `prisma migrate dev` because that command's interactive prompt
-- (required here since it's dropping a non-empty table) hangs in this
-- non-interactive environment — same reason as the migration this one
-- replaces. DDL matches exactly what Prisma would generate for the
-- updated models in schema.prisma.
--
-- `WorkerLocation` only ever held fake, simulated coordinates written by
-- the old demo's client-side location "sender" (linear interpolation
-- toward a hardcoded destination, not real GPS) — dropping it, not
-- migrating its rows, so no stale fake position gets mistaken for a
-- real one. Real GPS now lives directly on Worker, pushed over the
-- existing Socket.IO connection via the browser's Geolocation API.

-- DropTable
DROP TABLE "WorkerLocation";

-- AlterTable: real online/location state, on the Worker row itself
ALTER TABLE "Worker"
  ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "currentLat" DOUBLE PRECISION,
  ADD COLUMN "currentLng" DOUBLE PRECISION,
  ADD COLUMN "locationUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Worker_isOnline_idx" ON "Worker"("isOnline");

-- AlterTable: link an accepted SOS request to the real Booking it creates
ALTER TABLE "SosRequest" ADD COLUMN "bookingId" TEXT;

-- CreateIndex
CREATE INDEX "SosRequest_customerId_idx" ON "SosRequest"("customerId");

-- CreateIndex
CREATE INDEX "SosRequest_status_idx" ON "SosRequest"("status");
