import { withAuth } from "next-auth/middleware";

/**
 * Gate routes that require a signed-in user. This is Next.js 16's
 * "proxy" file convention (the renamed successor to `middleware.ts` —
 * next-auth's `withAuth` helper is unaffected by the rename, it's
 * still the same export). Runs in the Edge runtime and only decodes
 * the JWT cookie (no DB call) — freshness of role/profile data for
 * these pages still comes from the `session` callback in
 * lib/auth/authOptions.ts, which the page itself invokes via
 * getServerSession/useSession.
 *
 * This only checks "is there a valid session at all" for every matched
 * path, including /admin — it intentionally does NOT also check
 * `role === "ADMIN"` here. withAuth's `authorized` callback can only
 * redirect to the sign-in page on failure, which would bounce an
 * already-logged-in non-admin back to /login (confusing: "but I am
 * signed in"). The actual role check lives where a failure can send a
 * sensible response instead — the /admin page component itself
 * (redirects home) and every /api/admin/* route (requireAdminSession,
 * returns 403) — both already enforce it independently of this file.
 */
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/account/:path*", "/complete-profile", "/dashboard/:path*", "/admin/:path*"],
};
