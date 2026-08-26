import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";

/**
 * GET /api/worker/analytics
 *
 * Worker Income Intelligence: aggregates completed booking income,
 * peak earning hours, top service categories, and average job value,
 * then optionally calls OpenAI to generate AI coaching tips.
 *
 * Gracefully handles:
 *  - No OPENAI_API_KEY → returns calculated fallback suggestions
 *  - Worker has no/few completed jobs → returns safe placeholder analytics
 *  - OpenAI call failure → swallows the error and returns fallbacks
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  // --- 1. Find worker ---
  const worker = await prisma.worker.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      area: true,
      hourlyRateMinBdt: true,
      hourlyRateMaxBdt: true,
      categories: {
        include: { category: { select: { name: true } } },
      },
    },
  });

  if (!worker) {
    return Response.json({ error: "Worker profile not found." }, { status: 404 });
  }

  // --- 2. Fetch completed bookings ---
  const completedBookings = await prisma.booking.findMany({
    where: {
      workerId: worker.id,
      status: "COMPLETED",
    },
    select: {
      agreedRateBdt: true,
      completedAt: true,
      createdAt: true,
    },
    orderBy: { completedAt: "desc" },
    take: 200, // cap for performance
  });

  // --- 3. Aggregate metrics ---
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  let weeklyIncome = 0;
  let monthlyIncome = 0;
  let yearlyIncome = 0;
  let totalIncome = 0;

  // Hour bucket: index 0-23 counts jobs completed in that hour
  const hourBuckets: number[] = Array(24).fill(0);

  for (const b of completedBookings) {
    const rate = b.agreedRateBdt ?? 0;
    const date = b.completedAt ?? b.createdAt;
    totalIncome += rate;
    if (date >= oneWeekAgo) weeklyIncome += rate;
    if (date >= oneMonthAgo) monthlyIncome += rate;
    if (date >= oneYearAgo) yearlyIncome += rate;
    hourBuckets[date.getHours()] += 1;
  }

  const avgJobValue =
    completedBookings.length > 0
      ? Math.round(totalIncome / completedBookings.length)
      : Math.round((worker.hourlyRateMinBdt + worker.hourlyRateMaxBdt) / 2);

  // Top categories from worker's profile
  const topCategories = worker.categories
    .map((wc) => wc.category.name)
    .slice(0, 3);

  // Peak hour: find the hour with most completed jobs
  const peakHourIndex = hourBuckets.indexOf(Math.max(...hourBuckets));
  const peakHours = hourBuckets.map((count, hour) => ({ hour, count }));

  const analytics = {
    weeklyIncome,
    monthlyIncome,
    yearlyIncome,
    avgJobValue,
    totalJobsCompleted: completedBookings.length,
    topCategories,
    peakHours,
    peakHour: peakHourIndex,
    workerArea: worker.area,
  };

  // --- 4. AI coaching tips via OpenAI (optional, graceful fallback) ---
  let aiInsights: string | null = null;
  const openAiKey = process.env.OPENAI_API_KEY;

  if (openAiKey && completedBookings.length > 0) {
    try {
      const prompt = `You are a business coach for a home-services technician in Dhaka, Bangladesh.
Worker area: ${worker.area.replace(/_/g, " ")}
Service categories: ${topCategories.join(", ") || "General services"}
Weekly income: \u09f3${weeklyIncome.toLocaleString()}
Monthly income: \u09f3${monthlyIncome.toLocaleString()}
Total completed jobs: ${completedBookings.length}
Average job value: \u09f3${avgJobValue.toLocaleString()}
Peak working hour: ${peakHourIndex}:00

Give 3 short, practical, localized tips to help this worker earn more this week.
Also mention which Dhaka neighborhood near ${worker.area.replace(/_/g, " ")} is likely in high demand for their services right now.
Be specific, actionable, and encouraging. Keep it under 120 words total.`;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 200,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(8000), // 8s timeout
      });

      if (res.ok) {
        const data = await res.json() as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        aiInsights = data.choices?.[0]?.message?.content?.trim() ?? null;
      }
    } catch {
      // Silently fall through to fallback suggestions
    }
  }

  // --- 5. Fallback suggestions when AI is unavailable ---
  if (!aiInsights) {
    const area = worker.area.replace(/_/g, " ");
    const cat = topCategories[0] ?? "your service";
    if (completedBookings.length === 0) {
      aiInsights = `\ud83d\udca1 You haven't completed any jobs yet — your income analysis will appear here once you start. Try accepting a booking request today!\n\n\ud83d\udccd Demand tip: ${area} and nearby neighbourhoods are active on weekends. Make sure your profile is complete and you're marked as available.`;
    } else {
      aiInsights = `\ud83d\udca1 You earn most around ${peakHourIndex}:00 — schedule extra availability in that window.\n\n\ud83d\udd27 ${cat} is your strongest category. Consider highlighting it prominently on your profile to attract more bookings.\n\n\ud83d\udccd Demand tip: Check the Opportunities map — it shows live demand signals for ${area} and surrounding neighbourhoods, updated daily.`;
    }
  }

  return Response.json({ analytics, aiInsights });
}
