import type { DhakaArea } from "@/app/generated/prisma/client";

/**
 * Client-safe mirror of lib/opportunities/demandScore.ts's
 * OpportunityArea — that file imports `@/lib/db` (server-only Prisma),
 * so client components fetch this shape as plain JSON from
 * GET /api/opportunities rather than importing the server type.
 */
export type OpportunityAreaData = {
  area: DhakaArea;
  label: string;
  lat: number;
  lng: number;
  openJobRequests: number;
  recentBookings: number;
  recentSosRequests: number;
  recentFailedSearches: number;
  availableWorkers: number;
  score: number;
};
