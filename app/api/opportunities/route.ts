import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { getOpportunityAreas } from "@/lib/opportunities/demandScore";
import { getOpportunityInsight } from "@/lib/opportunities/opportunityInsight";
import { getDhakaWeather } from "@/lib/weather/openMeteo";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

// GET /api/opportunities
// Worker-only. Returns the demand heatmap data (score per area), the
// current Dhaka weather, and one AI-written sentence summarizing it.
export const GET = withErrorHandling(async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const worker = await prisma.worker.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!worker) {
    return Response.json({ error: "This page is for worker accounts." }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`opportunities:${session.user.id}:${ip}`, 30, 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  // Areas and weather don't depend on each other, so fetch both at
  // once. The AI insight needs both results, so it waits for them.
  const [areas, weather] = await Promise.all([getOpportunityAreas(), getDhakaWeather()]);
  const insight = await getOpportunityInsight(areas, weather);

  return Response.json({ areas, weather, insight });
});
