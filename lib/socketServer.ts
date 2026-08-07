import { Server as IOServer } from "socket.io";

/**
 * App Router route handlers don't get a raw `req.socket` the way Pages
 * Router API routes did, so there's no `req.socket.server.io` to reach
 * into anymore. `server.ts` creates the single Socket.IO server for the
 * whole process and registers it here; route handlers that need to emit
 * (SOS trigger/accept) pull it back out via `getIO()`.
 *
 * Stored on `globalThis` (not a module-level variable) for the same
 * reason `lib/db.ts` caches its Prisma client there: Next.js dev-mode
 * module reloads must not lose the reference to the still-running
 * server's socket instance.
 */
const globalForIO = globalThis as unknown as { __trackingIO?: IOServer };

export function setIO(io: IOServer): void {
  globalForIO.__trackingIO = io;
}

export function getIO(): IOServer | null {
  return globalForIO.__trackingIO ?? null;
}