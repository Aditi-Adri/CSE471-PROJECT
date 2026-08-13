import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { loadBookingWithViewerRole } from "@/lib/booking/loadBookingWithViewerRole";
import { shapeBookingForViewer } from "@/lib/booking/shapeBookingForViewer";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/bookings/[id]
 *
 * Fetches one booking, shaped for whichever side of it is asking —
 * the customer sees everything, the assigned worker sees the
 * address/phone only once the arrival code has been verified.
 * Anyone else gets a 404 (not 403 — this doesn't confirm the booking
 * exists to a party it's none of the business of).
 */
export const GET = withErrorHandling(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "You must be signed in." }, { status: 401 });
    }

    const { booking, viewer } = await loadBookingWithViewerRole(id, session);
    if (!booking || !viewer) {
      return Response.json({ error: "Booking not found." }, { status: 404 });
    }

    return Response.json({ booking: shapeBookingForViewer(booking, viewer) });
  }
);
