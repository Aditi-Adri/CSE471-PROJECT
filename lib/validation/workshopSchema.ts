import { z } from "zod";

// POST /api/workshops — an admin creating a workshop or training programme.
export const createWorkshopSchema = z
  .object({
    title: z.string().trim().min(3, "Give the workshop a title.").max(150),
    description: z.string().trim().min(10, "Describe what this workshop covers.").max(1000),
    scheduledAt: z.coerce.date(),
    isPaid: z.boolean(),
    feeBdt: z.number().int().min(1).max(1_000_000).optional(),
  })
  .refine((data) => !data.isPaid || data.feeBdt !== undefined, {
    message: "Set a fee for a paid workshop.",
    path: ["feeBdt"],
  });

export type CreateWorkshopInput = z.infer<typeof createWorkshopSchema>;
