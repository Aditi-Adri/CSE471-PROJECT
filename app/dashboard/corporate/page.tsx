import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CorporateDashboardClientSection } from "@/components/corporate/CorporateDashboardClientSection";

export const metadata: Metadata = { title: "Corporate Portal" };

/**
 * MODULE 3 -> FEATURE 3 (Corporate Portal): Corporate dashboard page.
 * Restricted to users with the CORPORATE role.
 */
export default async function CorporateDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard/corporate");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user || user.role !== "CORPORATE") {
    redirect("/account");
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <DashboardHeader userId={user.id} name={user.name} email={user.email} role={user.role} />
      <CorporateDashboardClientSection />
    </div>
  );
}
