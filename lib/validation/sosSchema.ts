import { z } from "zod";

/**
 * MODULE 1 -> FEATURE 3 (Jishan): Live Worker Tracking & SOS Emergency
 * Dispatch. Coordinates come straight from the browser's Geolocation API
 * (see components/sos/SosTrigger.tsx) — loosely bounded to real-world
 * lat/lng ranges, nothing Dhaka-specific, since a real emergency button
 * shouldn't silently reject a genuine GPS fix just because it falls
 * outside the areas the rest of the app assumes.
 */
export const triggerSosSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type TriggerSosInput = z.infer<typeof triggerSosSchema>;

export const workerStatusSchema = z.object({
  isOnline: z.boolean(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
export type WorkerStatusInput = z.infer<typeof workerStatusSchema>;
