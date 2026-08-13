import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { SosTrigger } from "@/components/sos/SosTrigger";

export const metadata: Metadata = { title: "Emergency SOS" };

/**
 * MODULE 1 -> FEATURE 3 (Jishan): the real emergency SOS page — see
 * components/sos/SosTrigger.tsx for the actual flow and app/api/sos for
 * the matching logic. Customer/corporate accounts only; a worker's own
 * emergency at their household would be an unusual edge case this
 * button isn't built for (they'd have no arrival code to give
 * themselves), so they're pointed at their job dashboard instead.
 */
export default async function SosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/sos");
  if (session.user.role === "WORKER") redirect("/dashboard/worker-job");
  if (session.user.role === "ADMIN") redirect("/admin/verifications");

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Emergency SOS</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          One tap alerts every verified technician online within 3km.
        </p>
      </div>
      <SosTrigger />
    </div>
  );
}
