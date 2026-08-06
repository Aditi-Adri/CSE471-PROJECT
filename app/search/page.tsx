import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchExperience } from "@/components/search/SearchExperience";
import { ResultsSkeleton } from "@/components/search/ResultsSkeleton";

export const metadata: Metadata = {
  title: "Find a Technician — HireLocal",
  description:
    "Browse verified local technicians in Dhaka, or describe your problem in plain text to find the right one instantly.",
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <ResultsSkeleton />
        </div>
      }
    >
      <SearchExperience />
    </Suspense>
  );
}
