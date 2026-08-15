import { z } from "zod";

/**
 * MODULE 2 -> FEATURE 1 (Shiva): AI TrustScore Engine + Review Fraud
 * Detection.
 */

export const submitReviewSchema = z.object({
  rating: z.number().int("Rating must be a whole number.").min(1, "Pick at least 1 star.").max(5, "5 stars is the max."),
  comment: z
    .string()
    .trim()
    .min(10, "Say a little more about the job — at least 10 characters.")
    .max(1000, "Keep it under 1000 characters."),
});
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

export const moderateReviewSchema = z.object({
  reviewId: z.string().min(1, "Missing review id."),
  action: z.enum(["hide", "unhide"]),
});
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
