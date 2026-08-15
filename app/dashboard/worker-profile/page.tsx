import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { WorkerProfileForm } from "@/components/verification/WorkerProfileForm";

export const metadata: Metadata = { title: "Set up your worker profile" };

export default async function WorkerProfileSetupPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/worker-profile");
  if (session.user.role !== "WORKER") redirect("/dashboard/verification");

  const existing = await prisma.worker.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (existing) redirect("/dashboard/verification");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 items-start justify-center px-4 py-16 sm:px-6 lg:px-8">
      <WorkerProfileForm />
    </div>
  );
}
