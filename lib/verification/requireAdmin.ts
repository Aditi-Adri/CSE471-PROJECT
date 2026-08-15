import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

export type AdminSessionCheck = { ok: true; session: Session } | { ok: false; response: Response };

/** Shared guard for the coordinator-only verification review endpoints. */
export async function requireAdminSession(): Promise<AdminSessionCheck> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, response: Response.json({ error: "You must be signed in." }, { status: 401 }) };
  }
  if (session.user.role !== "ADMIN") {
    return { ok: false, response: Response.json({ error: "Coordinator access required." }, { status: 403 }) };
  }
  return { ok: true, session };
}
