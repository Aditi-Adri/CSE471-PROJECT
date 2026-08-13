import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { QuickLinks } from "@/components/dashboard/QuickLinks";
import { AccountSummaryCard } from "@/components/dashboard/AccountSummaryCard";
import { ProfileSettingsForm } from "@/components/dashboard/ProfileSettingsForm";
import { PasswordSettingsForm } from "@/components/dashboard/PasswordSettingsForm";
// FEATURE: Spare Parts Store — Order History component
import { OrderHistory } from "@/components/dashboard/OrderHistory";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * MODULE 1 -> Common Workflows (Shiva): the one dashboard every role
 * lands on after signing in. Header, profile editing, and password
 * management are identical for everyone; only the quick-actions grid
 * and the account-summary card change per role, and only ever link to
 * pages that actually exist for that role today (see
 * docs/FEATURE_SPEC.md for what's built vs. still pending).
 */
export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login?callbackUrl=/account");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      role: true,
      passwordHash: true,
      createdAt: true,
      worker: { select: { verificationTier: true } },
    },
  });

  // Session cookie says we're signed in but the row is gone (deleted
  // account, wiped dev database) — bounce to login instead of crashing
  // on `user.name` below.
  if (!user) {
    redirect("/login?callbackUrl=/account");
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <DashboardHeader userId={user.id} name={user.name} email={user.email} role={user.role} />

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section>
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Quick actions</h2>
            <QuickLinks role={user.role} hasWorkerProfile={Boolean(user.worker)} />
          </section>

          <ProfileSettingsForm
            initialName={user.name}
            initialPhone={user.phone ?? ""}
            initialAddress={user.address ?? ""}
          />

          {/* FEATURE: Spare Parts Store — Order History section for workers */}
          {user.role === "WORKER" && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Recent Purchases</h2>
              <div className="bg-white rounded-lg border border-zinc-200 p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <OrderHistory workerId={user.id} />
              </div>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <AccountSummaryCard
            role={user.role}
            memberSince={user.createdAt}
            verificationTier={user.worker?.verificationTier}
          />
          <PasswordSettingsForm hasPassword={Boolean(user.passwordHash)} />
        </div>
      </div>
    </div>
  );
}
