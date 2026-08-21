import { z } from "zod";

// POST /api/complaints — a customer filing a complaint against a worker.
export const createComplaintSchema = z.object({
  workerId: z.string().min(1, "Missing worker id."),
  subject: z.string().trim().min(3, "Give the complaint a short subject.").max(150),
  description: z.string().trim().min(10, "Describe what happened in a bit more detail.").max(1000),
});
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

// POST /api/admin/complaints — an admin resolving a complaint, with an
// optional reply back to the customer.
export const resolveComplaintSchema = z.object({
  complaintId: z.string().min(1, "Missing complaint id."),
  reply: z.string().trim().max(1000).optional(),
});
export type ResolveComplaintInput = z.infer<typeof resolveComplaintSchema>;
