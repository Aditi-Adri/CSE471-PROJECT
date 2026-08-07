import { PUBLIC_ROLES, type PublicRole } from "@/lib/validation/authSchemas";

const ROLE_COPY: Record<PublicRole, { label: string; hint: string }> = {
  CUSTOMER: { label: "Customer", hint: "I need a technician" },
  WORKER: { label: "Worker", hint: "I offer services" },
  CORPORATE: { label: "Corporate Client", hint: "Hiring for a business" },
};

export function RoleSelect({
  value,
  onChange,
}: {
  value: PublicRole;
  onChange: (role: PublicRole) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {PUBLIC_ROLES.map((role) => {
        const isActive = value === role;
        return (
          <button
            key={role}
            type="button"
            onClick={() => onChange(role)}
            aria-pressed={isActive}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
              isActive
                ? "border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950 dark:text-brand-300"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            <span className="block font-semibold">{ROLE_COPY[role].label}</span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">{ROLE_COPY[role].hint}</span>
          </button>
        );
      })}
    </div>
  );
}
