import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { VerificationDashboard } from "@/components/verification/VerificationDashboard";

export const metadata: Metadata = { title: "Verification" };

export default async function VerificationPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/verification");

  if (session.user.role !== "WORKER") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Worker verification</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          This page is for worker accounts. You&apos;re signed in as a {session.user.role.toLowerCase()}.
        </p>
      </div>
    );
  }

  const worker = await prisma.worker.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!worker) redirect("/dashboard/worker-profile");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Get verified</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Complete all three tiers to earn the full trust badge and rank higher in search.
      </p>
      <VerificationDashboard />
    </div>
  );
}
