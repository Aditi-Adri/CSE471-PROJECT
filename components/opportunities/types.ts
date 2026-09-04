import type { DhakaArea } from "@/app/generated/prisma/client";

// Same shape as OpportunityArea in lib/opportunities/demandScore.ts.
// Client components use this copy since they can't import server-only
// Prisma code — they just get this shape as JSON from the API instead.
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
