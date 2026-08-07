import type { Metadata } from "next";
import { CompleteProfileForm } from "@/components/auth/CompleteProfileForm";

export const metadata: Metadata = {
  title: "Complete your profile",
  description: "Finish setting up your HireLocal account.",
};

export default function CompleteProfilePage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <CompleteProfileForm />
    </div>
  );
}
