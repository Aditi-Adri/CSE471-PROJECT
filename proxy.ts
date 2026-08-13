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
 *
 * /track, /sos, and /worker/dashboard are the Live Tracking & SOS
 * feature's manual test harnesses (worker/booking pickers, no real
 * ownership check of who's watching what) — matched here for the same
 * reason as the rest: anonymous drive-by access to live location data
 * isn't something this app wants, even for a demo page.
 */
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/account/:path*",
    "/complete-profile",
    "/dashboard/:path*",
    "/admin/:path*",
    "/track/:path*",
    "/sos/:path*",
    "/worker/dashboard",
  ],
};
