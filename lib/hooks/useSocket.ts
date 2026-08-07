"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

/**
 * Returns a memoized socket.io connection shared for the lifetime of the
 * component. Assumes the Next.js app is served by server.ts (same origin).
 */
export function useSocket(): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Only connects in the browser environment
    const socketInstance = io({
      path: "/socket.io",
      autoConnect: true,
    });

    // Set state from the "connect" callback, not synchronously here —
    // consumers gate their own effects on `socket` being non-null, so
    // this also means they only see it once the handshake actually
    // completes, not before.
    socketInstance.on("connect", () => setSocket(socketInstance));

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return socket;
}