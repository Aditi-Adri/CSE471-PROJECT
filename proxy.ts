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
 */
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/account/:path*", "/complete-profile"],
};
