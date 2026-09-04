import { z } from "zod";
import { DHAKA_AREAS } from "@/lib/constants/dhakaAreas";

const areaValues = DHAKA_AREAS.map((a) => a.value) as [string, ...string[]];

/** POST /api/job-requests — a customer posting what they need. */
export const createJobRequestSchema = z
  .object({
    description: z.string().trim().min(10, "Describe what you need in a bit more detail.").max(500),
    area: z.enum(areaValues),
    budgetMinBdt: z.number().int().min(0).max(1_000_000).optional(),
    budgetMaxBdt: z.number().int().min(0).max(1_000_000).optional(),
  })
  .refine(
    (data) =>
      data.budgetMinBdt === undefined ||
      data.budgetMaxBdt === undefined ||
      data.budgetMinBdt <= data.budgetMaxBdt,
    { message: "Minimum budget can't be higher than maximum budget.", path: ["budgetMinBdt"] }
  );

export type CreateJobRequestInput = z.infer<typeof createJobRequestSchema>;

/** GET /api/job-requests — a worker browsing the open list, filterable by area. */
export const listJobRequestsSchema = z.object({
  area: z.enum(areaValues).optional(),
});

export type ListJobRequestsInput = z.infer<typeof listJobRequestsSchema>;

/** POST /api/job-requests/[id]/hire — the customer picking one applicant. */
export const hireApplicantSchema = z.object({
  workerId: z.string().min(1, "Pick which worker to hire."),
});

export type HireApplicantInput = z.infer<typeof hireApplicantSchema>;

/** POST /api/job-requests/[id]/apply — worker applies with a wage. */
export const applyToJobSchema = z.object({
  wageBdt: z.number().int().min(1, "Enter a wage.").max(1_000_000),
});

export type ApplyToJobInput = z.infer<typeof applyToJobSchema>;

/** POST /api/job-requests/[id]/parts — hired worker buys parts for the job. */
export const buyPartsSchema = z.object({
  items: z
    .array(
      z.object({
        partId: z.string().min(1),
        quantity: z.number().int().min(1).max(100),
      })
    )
    .min(1, "Add at least one part."),
});

export type BuyPartsInput = z.infer<typeof buyPartsSchema>;
