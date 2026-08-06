export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="9" className="fill-brand-600" />
      <path
        d="M9.5 16.8 14 21.3 22.5 11"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
      <LogoMark size={size} />
      <span style={{ fontSize: size * 0.62 }}>HireLocal</span>
    </span>
  );
}
