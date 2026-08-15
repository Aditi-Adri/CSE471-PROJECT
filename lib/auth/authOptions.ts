import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/passwords";
import { customPrismaAdapter } from "@/lib/auth/prismaAdapter";

/** Account-lockout thresholds for the credentials login flow. */
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  adapter: customPrismaAdapter(),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt", // required: a Credentials provider can't use database sessions
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    // NextAuth sends first-time OAuth sign-ups here (Google gives us
    // name/email/photo but not phone or the role they want) so they
    // can finish the profile our schema needs.
    newUser: "/complete-profile",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // Safe specifically for Google (unlike most OAuth providers):
      // Google verifies the email address before OAuth ever completes,
      // so a customer who registered with a password can also
      // "Continue with Google" on the same address and land in the
      // same account, instead of hitting NextAuth's default
      // OAuthAccountNotLinked error.
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });

        // Identical message for "no such user" and "wrong password" —
        // a failed login should never reveal whether an email is
        // registered.
        const invalidCredentialsError = "Invalid email or password.";

        if (!user) {
          throw new Error(invalidCredentialsError);
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
          throw new Error(
            `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
          );
        }

        if (!user.passwordHash) {
          throw new Error('This account signs in with Google. Use "Continue with Google" instead.');
        }

        const validPassword = await verifyPassword(password, user.passwordHash);

        if (!validPassword) {
          const attempts = user.failedLoginAttempts + 1;
          const lockingOut = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: lockingOut ? 0 : attempts,
              lockedUntil: lockingOut ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
            },
          });
          // Tell them about the lockout on the attempt that actually
          // triggers it, not just on the next one — otherwise the 5th
          // wrong guess looks identical to the first.
          if (lockingOut) {
            const minutes = Math.ceil(LOCKOUT_DURATION_MS / 60_000);
            throw new Error(
              `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
            );
          }
          throw new Error(invalidCredentialsError);
        }

        // Successful login clears any lockout bookkeeping.
        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          phone: user.phone,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Only present on the request that just signed in — persist the
      // bits we need onto the token so later requests don't have to.
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.id) return session;

      // Re-read from the DB on every session check (not just at
      // login) so a role change — an admin promoting a Customer to
      // Worker, or the verification-tier feature bumping someone up —
      // takes effect immediately instead of waiting up to 30 days for
      // the JWT to expire.
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id },
        select: { id: true, name: true, email: true, image: true, role: true, phone: true },
      });
      if (!dbUser) return session;

      session.user = {
        ...session.user,
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        image: dbUser.image,
        role: dbUser.role,
        phone: dbUser.phone,
      };
      return session;
    },
  },
};
