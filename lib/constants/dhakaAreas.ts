import type { DhakaArea } from "@/app/generated/prisma/client";

export const DHAKA_AREAS: { value: DhakaArea; label: string }[] = [
  { value: "GULSHAN", label: "Gulshan" },
  { value: "BANANI", label: "Banani" },
  { value: "BARIDHARA", label: "Baridhara" },
  { value: "DHANMONDI", label: "Dhanmondi" },
  { value: "UTTARA", label: "Uttara" },
  { value: "MIRPUR", label: "Mirpur" },
  { value: "MOHAMMADPUR", label: "Mohammadpur" },
  { value: "BASHUNDHARA", label: "Bashundhara R/A" },
  { value: "BADDA", label: "Badda" },
  { value: "RAMPURA", label: "Rampura" },
  { value: "MOTIJHEEL", label: "Motijheel" },
  { value: "OLD_DHAKA", label: "Old Dhaka" },
  { value: "WARI", label: "Wari" },
  { value: "LALMATIA", label: "Lalmatia" },
  { value: "FARMGATE", label: "Farmgate" },
  { value: "TEJGAON", label: "Tejgaon" },
  { value: "KHILGAON", label: "Khilgaon" },
  { value: "MALIBAGH", label: "Malibagh" },
  { value: "JATRABARI", label: "Jatrabari" },
  { value: "MOHAKHALI", label: "Mohakhali" },
  { value: "BANASREE", label: "Banasree" },
  { value: "SAVAR", label: "Savar" },
];

export const AREA_LABEL_BY_VALUE = new Map(
  DHAKA_AREAS.map((a) => [a.value, a.label])
);

export const VERIFICATION_TIERS: {
  value: "UNVERIFIED" | "TIER1_ID_VERIFIED" | "TIER2_SKILL_TESTED" | "TIER3_POLICE_CLEARED";
  label: string;
  shortLabel: string;
  rank: number;
}[] = [
  { value: "UNVERIFIED", label: "Unverified", shortLabel: "Unverified", rank: 0 },
  { value: "TIER1_ID_VERIFIED", label: "Tier 1 · NID Verified", shortLabel: "Tier 1", rank: 1 },
  { value: "TIER2_SKILL_TESTED", label: "Tier 2 · Skill Tested", shortLabel: "Tier 2", rank: 2 },
  { value: "TIER3_POLICE_CLEARED", label: "Tier 3 · Police Cleared", shortLabel: "Tier 3", rank: 3 },
];
