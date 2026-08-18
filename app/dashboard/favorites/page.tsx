import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { FavoritesList } from "@/components/favorites/FavoritesList";

export const metadata: Metadata = { title: "My favorites" };

export default async function FavoritesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/favorites");
  if (session.user.role !== "CUSTOMER" && session.user.role !== "CORPORATE") redirect("/");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">My favorites</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Workers you&apos;ve saved — book them again without searching.
      </p>
      <FavoritesList />
    </div>
  );
}
