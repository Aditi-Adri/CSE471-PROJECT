import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { getOpportunityAreas } from "@/lib/opportunities/demandScore";
import { getOpportunityInsight } from "@/lib/opportunities/opportunityInsight";
import { getDhakaWeather } from "@/lib/weather/openMeteo";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/opportunities
 *
 * The neighborhood demand heatmap (Module 2, Feature 2) — worker-only,
 * same as every other worker-facing dashboard endpoint in this app.
 * Ties together the three pieces built for this feature: real
 * per-area supply/demand scores (demandScore.ts), a free-tier AI
 * summary of them (opportunityInsight.ts, Groq), and real current
 * Dhaka weather as extra context (openMeteo.ts) — computed fresh on
 * every request rather than cached, since it's meant to reflect right
 * now, and the underlying queries are cheap aggregate counts.
 */
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

  // Areas and weather are independent — fetch in parallel — but the AI
  // insight wants both as input (real weather as optional context, see
  // opportunityInsight.ts), so it has to wait for them.
  const [areas, weather] = await Promise.all([getOpportunityAreas(), getDhakaWeather()]);
  const insight = await getOpportunityInsight(areas, weather);

  return Response.json({ areas, weather, insight });
});
