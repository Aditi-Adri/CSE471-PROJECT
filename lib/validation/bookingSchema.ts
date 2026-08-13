import { z } from "zod";

/**
 * MODULE 1 -> FEATURE 4 (Sudiptha): real booking request + bargaining +
 * arrival-code confirmation gate.
 */

const rateSchema = z
  .number()
  .int("Enter a whole number of taka.")
  .min(100, "That rate looks too low — enter the amount in taka.")
  .max(200_000, "That rate looks too high — enter the amount in taka.");

export const createBookingSchema = z.object({
  workerId: z.string().min(1, "Missing worker."),
  address: z.string().trim().min(5, "Enter the service address.").max(300),
  proposedRateBdt: rateSchema,
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const workerRespondSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("reject") }),
  z.object({ action: z.literal("counter"), counterRateBdt: rateSchema }),
]);
export type WorkerRespondInput = z.infer<typeof workerRespondSchema>;

export const customerRespondCounterSchema = z.object({
  action: z.enum(["accept", "reject"]),
});
export type CustomerRespondCounterInput = z.infer<typeof customerRespondCounterSchema>;

export const verifyArrivalCodeSchema = z.object({
  code: z.string().trim().min(1, "Enter the code."),
});
export type VerifyArrivalCodeInput = z.infer<typeof verifyArrivalCodeSchema>;
