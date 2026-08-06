import Link from "next/link";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
            Verified, background-checked local technicians for every home repair —
            matched instantly from a plain-text description of the problem.
          </p>
        </div>

        <FooterColumn
          title="Platform"
          links={[
            { href: "/search", label: "Find a technician" },
            { href: "/#categories", label: "Browse categories" },
            { href: "/#how-it-works", label: "How it works" },
          ]}
        />

        <FooterColumn
          title="Trust & safety"
          links={[
            { href: "/#trust", label: "Verification tiers" },
            { href: "/search", label: "Filter by verified pros" },
          ]}
        />
      </div>

      <div className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
        © {new Date().getFullYear()} HireLocal. All rights reserved.
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
