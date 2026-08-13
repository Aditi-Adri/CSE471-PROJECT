import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { MyBookingsList } from "@/components/booking/MyBookingsList";

export const metadata: Metadata = { title: "My bookings" };

export default async function MyBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/bookings");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">My bookings</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Every technician you&apos;ve requested, and where things stand.
      </p>
      <MyBookingsList />
    </div>
  );
}
