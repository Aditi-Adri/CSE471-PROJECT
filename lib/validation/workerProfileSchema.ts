import { z } from "zod";
import { DHAKA_AREAS } from "@/lib/constants/dhakaAreas";

const areaValues = DHAKA_AREAS.map((a) => a.value) as [string, ...string[]];

export const createWorkerProfileSchema = z
  .object({
    headline: z.string().trim().min(10, "Give a short, specific headline (10+ characters).").max(100),
    bio: z.string().trim().min(30, "Tell customers a bit more about your work (30+ characters).").max(1000),
    area: z.enum(areaValues),
    addressDetail: z.string().trim().min(5, "Add a working area / address detail.").max(200),
    hourlyRateMinBdt: z.number().int().min(0).max(1_000_000),
    hourlyRateMaxBdt: z.number().int().min(0).max(1_000_000),
    yearsExperience: z.number().int().min(0).max(60),
    categoryIds: z.array(z.string().min(1)).min(1, "Pick at least one service category.").max(5),
  })
  .refine((data) => data.hourlyRateMinBdt <= data.hourlyRateMaxBdt, {
    message: "Minimum rate can't be higher than maximum rate.",
    path: ["hourlyRateMinBdt"],
  });
export type CreateWorkerProfileInput = z.infer<typeof createWorkerProfileSchema>;
