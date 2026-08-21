import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your HireLocal account.",
};

// useSearchParams() (for the ?ref= referral code prefill, below)
// requires a Suspense boundary above it — same reason app/shop/cart's
// page has one, including the fallback (a bare <Suspense> with none
// renders nothing while suspended, which reads as a blank page rather
// than a loading state).
export default function RegisterPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Suspense
        fallback={<p className="animate-pulse text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>}
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
