import { z } from "zod";

// Client compresses images before sending (see lib/faceMatch/imageUtils.ts);
// this cap is a hard server-side backstop, not the primary size control.
const imageDataUrlSchema = z
  .string()
  .startsWith("data:image/", "Expected an image file.")
  .max(2_000_000, "Image is too large — try a smaller photo.");

export const tier1SubmitSchema = z.object({
  nidImage: imageDataUrlSchema,
  selfieImage: imageDataUrlSchema,
  // Face-match distance from the client-side comparison. Optional
  // because a legitimate submission can still come through when no
  // face was detected in one of the photos — that just skips
  // auto-approval and goes to manual review instead of being rejected
  // outright by a client-side algorithm.
  matchDistance: z.number().min(0).max(2).optional(),
});
export type Tier1SubmitInput = z.infer<typeof tier1SubmitSchema>;

export const tier2RequestSchema = z.object({
  preferredSchedule: z.string().trim().max(300).optional().or(z.literal("")),
});
export type Tier2RequestInput = z.infer<typeof tier2RequestSchema>;

export const referenceSchema = z.object({
  name: z.string().trim().min(2, "Enter the reference's name.").max(100),
  phone: z.string().trim().regex(/^\+?[0-9]{7,15}$/, "Enter a valid phone number."),
  relationship: z.string().trim().min(2, "e.g. \"previous customer\".").max(100),
});

export const tier3SubmitSchema = z.object({
  clearanceDocument: imageDataUrlSchema,
  references: z.array(referenceSchema).min(1, "Add at least one reference.").max(3, "Up to 3 references."),
});
export type Tier3SubmitInput = z.infer<typeof tier3SubmitSchema>;

const decisionSchema = z.enum(["APPROVED", "REJECTED"]);
const noteSchema = z.string().trim().max(1000).optional().or(z.literal(""));

export const tier1ReviewSchema = z.object({
  workerId: z.string().min(1),
  decision: decisionSchema,
  reviewNote: noteSchema,
});
export type Tier1ReviewInput = z.infer<typeof tier1ReviewSchema>;

export const tier2EvaluateSchema = z.object({
  workerId: z.string().min(1),
  decision: decisionSchema,
  evaluatorNote: noteSchema,
});
export type Tier2EvaluateInput = z.infer<typeof tier2EvaluateSchema>;

export const tier3ReviewSchema = z.object({
  workerId: z.string().min(1),
  decision: decisionSchema,
  reviewNote: noteSchema,
  referenceUpdates: z
    .array(
      z.object({
        id: z.string().min(1),
        contacted: z.boolean(),
        verified: z.boolean(),
        note: z.string().trim().max(300).optional().or(z.literal("")),
      })
    )
    .optional()
    .default([]),
});
export type Tier3ReviewInput = z.infer<typeof tier3ReviewSchema>;
