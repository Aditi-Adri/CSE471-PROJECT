import { z } from "zod";

/**
 * MODULE 3 -> FEATURE 3 (Corporate Portal): input validation for the
 * corporate property and booking API routes.
 */

const DHAKA_AREAS = [
  "GULSHAN", "BANANI", "BARIDHARA", "DHANMONDI", "UTTARA", "MIRPUR",
  "MOHAMMADPUR", "BASHUNDHARA", "BADDA", "RAMPURA", "MOTIJHEEL",
  "OLD_DHAKA", "WARI", "LALMATIA", "FARMGATE", "TEJGAON", "KHILGAON",
  "MALIBAGH", "JATRABARI", "MOHAKHALI", "BANASREE", "SAVAR",
] as const;

export const addPropertySchema = z.object({
  label: z
    .string()
    .trim()
    .min(2, "Give the property a short name (e.g. \"Banani Building\").")
    .max(120),
  address: z
    .string()
    .trim()
    .min(5, "Enter the full street address.")
    .max(300),
  area: z.enum(DHAKA_AREAS, { message: "Pick a valid Dhaka area." }),
  contactName: z.string().trim().max(100).optional(),
  contactPhone: z.string().trim().max(20).optional(),
});
export type AddPropertyInput = z.infer<typeof addPropertySchema>;

const rateSchema = z
  .number()
  .int("Enter a whole number of taka.")
  .min(100, "That rate looks too low — enter the amount in taka.")
  .max(200_000, "That rate looks too high — enter the amount in taka.");

export const corporateBookingSchema = z.object({
  workerId: z.string().min(1, "Missing worker."),
  corporatePropertyId: z.string().min(1, "Select a property."),
  proposedRateBdt: rateSchema,
});
export type CorporateBookingInput = z.infer<typeof corporateBookingSchema>;
