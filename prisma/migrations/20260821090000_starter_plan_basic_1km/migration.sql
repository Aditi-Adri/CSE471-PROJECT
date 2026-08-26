-- MODULE 3 -> Worker Subscription & Working Radius (new feature).
--
-- Two small, additive changes requested after the feature first shipped:
--  1. Basic is now fixed at 1km (was a worker-chosen 1-2km before).
--  2. A new cheap "Starter" plan (2km) sits between Basic and Standard —
--     what used to be Basic's optional 2km choice is now its own paid tier.
--
-- Both changes are safe on a live database with existing rows:
--  - Adding an enum value never touches existing rows.
--  - Changing a column's DEFAULT only affects future inserts that don't
--    specify a value — every existing worker keeps whatever radius they
--    already had.

-- AlterEnum: add the new "Starter" tier
ALTER TYPE "SubscriptionTier" ADD VALUE 'STARTER';

-- AlterTable: Basic's default radius is now 1km, not 2km
ALTER TABLE "Worker" ALTER COLUMN "serviceRadiusKm" SET DEFAULT 1;
