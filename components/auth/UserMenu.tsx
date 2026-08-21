"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return <div className="h-9 w-20 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />;
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-full px-3 py-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="inline-flex items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const displayName = session.user?.name ?? session.user?.email ?? "Account";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-zinc-200 py-1 pl-1 pr-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
          {initial}
        </span>
        <span className="hidden sm:inline">{displayName.split(" ")[0]}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30">
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Dashboard
          </Link>
          {session.user.role === "WORKER" && (
            <>
              <Link
                href="/dashboard/verification"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Get verified
              </Link>
              <Link
                href="/dashboard/job-requests"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Open requests
              </Link>
              <Link
                href="/dashboard/my-applications"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                My applications
              </Link>
              <Link
                href="/dashboard/opportunities"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Opportunities
              </Link>
              {/* MODULE 3 (Sudiptha): Spare Parts Shop. */}
              <Link
                href="/shop"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Shop
              </Link>
              {/* MODULE 3 (Adri): Workshops & training programs. */}
              <Link
                href="/dashboard/workshops"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Workshops
              </Link>
            </>
          )}
          {(session.user.role === "CUSTOMER" || session.user.role === "CORPORATE") && (
            <>
              <Link
                href="/dashboard/favorites"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                My favorites
              </Link>
              <Link
                href="/dashboard/workshops"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Workshops
              </Link>
            </>
          )}
          {session.user.role === "ADMIN" && (
            <>
              <Link
                href="/admin/verifications"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Verification queue
              </Link>
              <Link
                href="/admin/workshops"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Workshops
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="block w-full px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
