import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Set a new HireLocal password.",
};

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
