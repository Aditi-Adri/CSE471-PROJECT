import type { Role } from "@/app/generated/prisma/client";

/** Human-readable label for each account role — shown on the dashboard, badges, and menus. */
export const ROLE_LABELS: Record<Role, string> = {
  CUSTOMER: "Customer",
  WORKER: "Worker",
  CORPORATE: "Corporate Client",
  ADMIN: "Admin",
};
