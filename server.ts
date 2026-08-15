import "dotenv/config";
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { prisma } from "./lib/db";
import { distanceKm } from "./lib/geo";
import { estimateEtaMinutesFallback } from "./lib/eta";
import { sendSms } from "./lib/twilio";
import { setIO } from "./lib/socketServer";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));

  const io = new Server(httpServer, { path: "/socket.io" });

  setIO(io);

  io.on("connection", (socket) => {
    socket.on("worker:register", ({ workerId }: { workerId?: string }) => {
      if (workerId) socket.join(`worker:${workerId}`);
    });

    socket.on("sos:join", ({ sosId }: { sosId?: string }) => {
      if (sosId) socket.join(`sos:${sosId}`);
    });

    socket.on("tracking:join", ({ bookingId }: { bookingId?: string }) => {
      if (bookingId) socket.join(`tracking:${bookingId}`);
    });

    /**
     * Standalone location ping from a worker who's "online" (see
     * POST /api/worker/status) but not necessarily mid-job — this is
     * what keeps Worker.currentLat/currentLng fresh enough for the SOS
     * proximity query in app/api/sos/route.ts to find them. Booking-scoped
     * tracking (above) also keeps this fresh while a job is in progress,
     * so a worker who's mid-job doesn't need to send both.
     *
     * Like `worker:register`/`location:update`, this trusts the
     * client-supplied `workerId` rather than re-deriving it from a
     * session — this socket server has no auth layer of its own. Every
     * write that actually matters (going online, accepting an SOS,
     * creating the resulting booking) happens over the authenticated
     * REST API instead; this only ever moves a live position on the map.
     */
    socket.on(
      "worker:location",
      async ({ workerId, lat, lng }: { workerId?: string; lat?: number; lng?: number }) => {
        if (!workerId || lat == null || lng == null) return;
        try {
          await prisma.worker.update({
            where: { id: workerId },
            data: { currentLat: lat, currentLng: lng, locationUpdatedAt: new Date() },
          });
        } catch (err: unknown) {
          console.error("worker:location handler failed:", err instanceof Error ? err.message : err);
        }
      }
    );

    socket.on(
      "location:update",
      async ({ bookingId, lat, lng }: { bookingId?: string; lat?: number; lng?: number }) => {
        if (!bookingId || lat == null || lng == null) return;

        try {
          const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
          if (!booking) return;

          const distance = distanceKm(lat, lng, booking.destinationLat, booking.destinationLng);
          const hasArrived = distance < 0.05; // ~50m
          const etaMinutes = hasArrived ? 0 : estimateEtaMinutesFallback(distance);

          // GPS proximity alone never flips `status` to ARRIVED — that's
          // the arrival-code verification's job (see
          // app/api/bookings/[id]/verify-code/route.ts), which is also
          // what sets `arrivalVerifiedAt` and reveals the customer's
          // address/phone to the worker. If this GPS check set ARRIVED
          // on its own, verify-code (which only accepts a still-CONFIRMED
          // booking) would permanently reject the real code afterward,
          // silently bypassing that whole safety gate. This still
          // reports `etaMinutes: 0` so the UI can nudge "you've arrived —
          // enter the code", it just doesn't act on it by itself.
          const data: { etaMinutes: number; tenMinuteAlertSent?: boolean } = { etaMinutes };
          let shouldSendTenMinAlert = false;

          if (!hasArrived && etaMinutes <= 10 && !booking.tenMinuteAlertSent) {
            data.tenMinuteAlertSent = true;
            shouldSendTenMinAlert = true;
          }

          await prisma.booking.update({ where: { id: bookingId }, data });

          if (booking.workerId) {
            await prisma.worker
              .update({
                where: { id: booking.workerId },
                data: { currentLat: lat, currentLng: lng, locationUpdatedAt: new Date() },
              })
              .catch(() => {});
          }

          if (shouldSendTenMinAlert && booking.customerPhone) {
            sendSms(
              booking.customerPhone,
              `HireLocal: your technician is about ${etaMinutes} min away.`
            ).catch((err: unknown) =>
              console.error("SMS failed:", err instanceof Error ? err.message : err)
            );
          }

          io.to(`tracking:${bookingId}`).emit("location:update", {
            bookingId,
            lat,
            lng,
            etaMinutes,
          });
        } catch (err: unknown) {
          console.error("location:update handler failed:", err instanceof Error ? err.message : err);
        }
      }
    );
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});