import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { loadBookingWithViewerRole } from "@/lib/booking/loadBookingWithViewerRole";
import { shapeBookingForViewer } from "@/lib/booking/shapeBookingForViewer";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

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

    const updated = await prisma.booking.update({ where: { id: booking.id }, data: { status: "COMPLETED" } });
    return Response.json({ booking: shapeBookingForViewer(updated, "customer") });
  }
);
