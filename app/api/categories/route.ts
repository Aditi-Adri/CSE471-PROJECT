import { prisma } from "@/lib/db";

// GET /api/categories
// The list of service categories for the search page's filter dropdown.
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
