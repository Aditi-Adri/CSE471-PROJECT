"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/UserMenu";
import { Logo } from "./Logo";

const NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#categories", label: "Categories" },
  { href: "/#trust", label: "Trust & safety" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className={`hidden items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition sm:inline-flex ${
              pathname === "/search"
                ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                : "bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700"
            }`}
          >
            Find a technician
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
