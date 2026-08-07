"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { GoogleButton } from "./GoogleButton";
import { RoleSelect } from "./RoleSelect";
import { authCardClasses, errorBannerClasses, inputClasses, primaryButtonClasses } from "./shared";
import { type PublicRole } from "@/lib/validation/authSchemas";
import { firstIssueMessage } from "@/lib/validation/formatZodIssues";

export function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<PublicRole>("CUSTOMER");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password, confirmPassword, role }),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(firstIssueMessage(data.issues, data.error ?? "Something went wrong. Please try again."));
      setIsSubmitting(false);
      return;
    }

    // Registration succeeded — sign the new account straight in rather
    // than bouncing them to a separate login screen.
    const result = await signIn("credentials", { redirect: false, email, password });
    setIsSubmitting(false);

    if (result?.error) {
      // Extremely unlikely right after a successful registration, but
      // fall back to a manual login if it happens.
      router.push("/login");
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <div className={`max-w-md ${authCardClasses}`}>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Create your account</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Log in
        </Link>
      </p>

      <div className="mt-6">
        <GoogleButton callbackUrl="/account" />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-zinc-400">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        or
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <p className={errorBannerClasses}>{error}</p>}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">I am a</span>
          <RoleSelect value={role} onChange={setRole} />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Full name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClasses}
            placeholder="Your name"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClasses}
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Phone <span className="font-normal text-zinc-400">(optional)</span>
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClasses}
            placeholder="+8801XXXXXXXXX"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClasses}
            placeholder="At least 8 characters, 1 letter & 1 number"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Confirm password</span>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClasses}
            placeholder="Re-enter your password"
          />
        </label>

        <button type="submit" disabled={isSubmitting} className={primaryButtonClasses}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
