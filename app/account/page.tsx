import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { LogoutButton } from "@/components/auth/LogoutButton";

export const metadata: Metadata = {
  title: "Your account",
};

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: "Customer",
  WORKER: "Worker",
  CORPORATE: "Corporate Client",
  ADMIN: "Admin",
};

/**
 * Minimal protected page — proves the whole auth loop end to end
 * (middleware.ts already redirects unauthenticated requests to
 * /login, this server-side check is defense in depth and how the
 * page reads the session data it renders).
 */
export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login?callbackUrl=/account");
  }

  const { user } = session;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg shadow-zinc-900/5 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
            {user.name?.[0]?.toUpperCase() ?? "?"}
          </span>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{user.name}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Role</dt>
            <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
              {ROLE_LABELS[user.role] ?? user.role}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Phone</dt>
            <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{user.phone ?? "Not set"}</dd>
          </div>
        </dl>

        <div className="mt-8 border-t border-zinc-100 pt-6 dark:border-zinc-800">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
