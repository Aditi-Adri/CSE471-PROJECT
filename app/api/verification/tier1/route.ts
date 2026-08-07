import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { tier1SubmitSchema } from "@/lib/validation/verificationSchemas";
import { canSubmitTier1 } from "@/lib/verification/tierGating";
import { getWorkerTierSnapshot } from "@/lib/verification/getTierSnapshot";
import { syncWorkerVerificationTier } from "@/lib/verification/applyTierApproval";
import { AUTO_APPROVE_DISTANCE_THRESHOLD } from "@/lib/faceMatch/threshold";

/**
 * POST /api/verification/tier1
 *
 * Submit (or resubmit, after a rejection) the NID photo + selfie pair.
 * `matchDistance` — if present — comes from the client-side face
 * comparison (lib/faceMatch/compareFaces.ts), but auto-approval is
 * decided here, independently, against the same threshold: a client
 * can lie about a boolean, it can't lower the number below the bar
 * without actually submitting a close-enough pair.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`tier1-submit:${session.user.id}:${ip}`, 10, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
  }

  const worker = await prisma.worker.findUnique({ where: { userId: session.user.id } });
  if (!worker) {
    return Response.json({ error: "Create your worker profile before verifying." }, { status: 403 });
  }

  const snapshot = await getWorkerTierSnapshot(worker.id);
  if (!canSubmitTier1(snapshot)) {
    return Response.json(
      { error: "Tier 1 is already approved or awaiting review — nothing to submit." },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = tier1SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid submission.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { nidImage, selfieImage, matchDistance } = parsed.data;
  const autoApproved = typeof matchDistance === "number" && matchDistance < AUTO_APPROVE_DISTANCE_THRESHOLD;
  const now = new Date();

  await prisma.tier1Verification.upsert({
    where: { workerId: worker.id },
    create: {
      workerId: worker.id,
      nidImage,
      selfieImage,
      matchDistance: matchDistance ?? null,
      autoApproved,
      status: autoApproved ? "APPROVED" : "PENDING",
      reviewedAt: autoApproved ? now : null,
    },
    update: {
      nidImage,
      selfieImage,
      matchDistance: matchDistance ?? null,
      autoApproved,
      status: autoApproved ? "APPROVED" : "PENDING",
      reviewedAt: autoApproved ? now : null,
      reviewedById: null,
      reviewNote: null,
    },
  });

  if (autoApproved) {
    await syncWorkerVerificationTier(worker.id);
  }

  return Response.json({
    status: autoApproved ? "APPROVED" : "PENDING",
    autoApproved,
  });
}
