import type { Metadata } from "next";
import { SearchExperience } from "@/components/search/SearchExperience";

export const metadata: Metadata = {
  title: "Find a Technician — HireLocal",
  description:
    "Search verified local technicians in Dhaka by describing your problem in plain text.",
};

export default function SearchPage() {
  return <SearchExperience />;
}
