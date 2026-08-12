import "dotenv/config";
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { prisma } from "./lib/db";
import { distanceKm } from "./lib/geo";
import { estimateEtaMinutesFallback } from "./lib/eta";
import { sendSms } from "./lib/twilio";
import { setIO } from "./lib/socketServer";
import type { BookingStatus } from "./app/generated/prisma/client";

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

          const data: {
            etaMinutes: number;
            status?: BookingStatus;
            tenMinuteAlertSent?: boolean;
          } = { etaMinutes };
          let shouldSendTenMinAlert = false;

          if (hasArrived) {
            data.status = "ARRIVED";
          } else if (etaMinutes <= 10 && !booking.tenMinuteAlertSent) {
            data.tenMinuteAlertSent = true;
            shouldSendTenMinAlert = true;
          }

          await prisma.booking.update({ where: { id: bookingId }, data });

          if (booking.workerId) {
            await prisma.workerLocation
              .updateMany({ where: { workerId: booking.workerId }, data: { lat, lng } })
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