import { prisma } from "@/lib/db";

/**
 * GET /api/tracking/workers
 *
 * Lists all seeded demo technicians (WorkerLocation rows) for the live
 * tracking picker at /track.
 */
export async function GET() {
  try {
    const workers = await prisma.workerLocation.findMany();
    return Response.json(workers);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}