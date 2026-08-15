import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { loadBookingWithViewerRole } from "@/lib/booking/loadBookingWithViewerRole";
import { shapeBookingForViewer } from "@/lib/booking/shapeBookingForViewer";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { recomputeTrustScore } from "@/lib/trust/recomputeTrustScore";
// MODULE 2 -> FEATURE 4 (Sudiptha): Worker Income Intelligence Dashboard
// + AI Predictive Planner — this is the only place a completed booking
// ever becomes a WorkerJob financial-history row. See
// lib/income/recordCompletedJob.ts for the exact rules.
import { recordCompletedJob } from "@/lib/income/recordCompletedJob";

/**
 * POST /api/bookings/[id]/complete
 *
 * The customer confirms the job is done — matches the PDF's own
 * framing ("payment is only given to the worker after you verify the
 * job is done"). Only valid once arrival was actually verified;
 * there's nothing to complete otherwise. There's no payment/escrow
 * behind this yet (Module 2 F3) — this only ever flips the status.
 */
export const POST = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "You must be signed in." }, { status: 401 });
    }

    const { booking, viewer } = await loadBookingWithViewerRole(id, session);
    if (!booking || viewer !== "customer") {
      return Response.json({ error: "Booking not found." }, { status: 404 });
    }
    if (booking.status !== "ARRIVED") {
      return Response.json({ error: "This job isn't ready to be marked complete yet." }, { status: 409 });
    }

    // MODULE 2 -> FEATURE 1 (Shiva): completedAt is what the review
    // window (72h, see lib/trust/reviewEligibility.ts) is measured
    // from, and what the completion-reliability trust-score metric
    // counts. recomputeTrustScore also refreshes Worker.completedJobs
    // from the real count here, replacing whatever seed/stale value it
    // had before.
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    if (updated.workerId) {
      await recomputeTrustScore(updated.workerId);
      // Best-effort: the Income Intelligence dashboard shouldn't be able
      // to break job completion if this ever throws (e.g. a transient DB
      // hiccup) — the booking itself is already COMPLETED at this point.
      await recordCompletedJob(updated).catch((err: unknown) =>
        console.error("recordCompletedJob failed:", err instanceof Error ? err.message : err)
      );
    }

    return Response.json({ booking: shapeBookingForViewer(updated, "customer") });
  }
);
