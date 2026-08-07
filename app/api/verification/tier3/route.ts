import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { tier3SubmitSchema } from "@/lib/validation/verificationSchemas";
import { canSubmitTier3 } from "@/lib/verification/tierGating";
import { getWorkerTierSnapshot } from "@/lib/verification/getTierSnapshot";

/**
 * POST /api/verification/tier3
 *
 * Submits (or resubmits) the police clearance document plus previous-
 * customer references. Always goes to PENDING for a coordinator's
 * manual review — contacting references and checking an official
 * document isn't something this app can legitimately automate.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`tier3-submit:${session.user.id}:${ip}`, 10, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
  }

  const worker = await prisma.worker.findUnique({ where: { userId: session.user.id } });
  if (!worker) {
    return Response.json({ error: "Create your worker profile before verifying." }, { status: 403 });
  }

  const snapshot = await getWorkerTierSnapshot(worker.id);
  if (!canSubmitTier3(snapshot)) {
    return Response.json(
      { error: "Tier 3 isn't available yet — pass Tier 2 first, or it's already submitted/approved." },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = tier3SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid submission.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { clearanceDocument, references } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const tier3 = await tx.tier3PoliceClearance.upsert({
      where: { workerId: worker.id },
      create: { workerId: worker.id, clearanceDocument, status: "PENDING" },
      update: {
        clearanceDocument,
        status: "PENDING",
        reviewedById: null,
        reviewNote: null,
        reviewedAt: null,
        submittedAt: new Date(),
      },
    });

    // Resubmission replaces the reference list wholesale rather than
    // trying to diff it — simpler, and a resubmission is rare enough
    // (only after a rejection) that this isn't a real cost.
    await tx.workerReference.deleteMany({ where: { tier3Id: tier3.id } });
    await tx.workerReference.createMany({
      data: references.map((r) => ({
        tier3Id: tier3.id,
        name: r.name,
        phone: r.phone,
        relationship: r.relationship,
      })),
    });
  });

  return Response.json({ status: "PENDING" });
}
