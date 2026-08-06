import { prisma } from "@/lib/db";

/**
 * GET /api/categories
 *
 * Powers the "browse by category" filter dropdown on the search page.
 * Small, cacheable, and rarely changes, so a short edge cache is safe.
 */
export async function GET() {
  const categories = await prisma.serviceCategory.findMany({
    select: { id: true, name: true, slug: true, icon: true, description: true },
    orderBy: { name: "asc" },
  });

  return Response.json(
    { categories },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
  );
}
