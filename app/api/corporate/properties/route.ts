import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { addPropertySchema } from "@/lib/validation/corporateSchemas";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/corporate/properties
 *
 * MODULE 3 -> FEATURE 3 (Corporate Portal): returns every property
 * address the signed-in CORPORATE user has registered.
 */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (session.user.role !== "CORPORATE") {
    return Response.json({ error: "This endpoint is for corporate accounts." }, { status: 403 });
  }

  const properties = await prisma.corporateProperty.findMany({
    where: { corporateUserId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ properties });
});

/**
 * POST /api/corporate/properties
 *
 * MODULE 3 -> FEATURE 3 (Corporate Portal): registers a new property
 * address under the signed-in CORPORATE user's account. Validated
 * with `addPropertySchema`.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (session.user.role !== "CORPORATE") {
    return Response.json({ error: "This endpoint is for corporate accounts." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = addPropertySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid property details.", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const property = await prisma.corporateProperty.create({
    data: {
      corporateUserId: session.user.id,
      label: parsed.data.label,
      address: parsed.data.address,
      area: parsed.data.area,
      contactName: parsed.data.contactName,
      contactPhone: parsed.data.contactPhone,
    },
  });

  return Response.json({ property }, { status: 201 });
});
