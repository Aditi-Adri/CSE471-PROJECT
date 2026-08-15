import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";
import { prisma } from "@/lib/db";

/**
 * Hand-rolled NextAuth adapter against our own Prisma client.
 *
 * The published `@next-auth/prisma-adapter` package types its
 * `PrismaClient` parameter against the classic `@prisma/client` export
 * (`.prisma/client`). This project generates the Prisma Client to a
 * custom path (`app/generated/prisma`, via Prisma 7's newer
 * `prisma-client` generator — see prisma/schema.prisma), so that
 * classic export doesn't exist here and the published adapter can't
 * type-check against our client.
 *
 * NextAuth's `Adapter` interface itself has no Prisma dependency at
 * all — every method is optional, and we only need the handful that
 * sign-in actually touches. Session-table methods (createSession,
 * getSessionAndUser, updateSession, deleteSession) are intentionally
 * omitted: with `session.strategy: "jwt"` (required anyway once a
 * Credentials provider is in the mix) NextAuth never calls them.
 */
export function customPrismaAdapter(): Adapter {
  return {
    async createUser(data: Omit<AdapterUser, "id">) {
      const user = await prisma.user.create({
        data: {
          name: data.name ?? "",
          email: data.email,
          emailVerified: data.emailVerified,
          image: data.image,
        },
      });
      return user as unknown as AdapterUser;
    },

    async getUser(id) {
      const user = await prisma.user.findUnique({ where: { id } });
      return (user as unknown as AdapterUser) ?? null;
    },

    async getUserByEmail(email) {
      const user = await prisma.user.findUnique({ where: { email } });
      return (user as unknown as AdapterUser) ?? null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const account = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      });
      return (account?.user as unknown as AdapterUser) ?? null;
    },

    async updateUser(data) {
      const user = await prisma.user.update({
        where: { id: data.id },
        data: {
          name: data.name ?? undefined,
          email: data.email ?? undefined,
          emailVerified: data.emailVerified,
          image: data.image ?? undefined,
        },
      });
      return user as unknown as AdapterUser;
    },

    async linkAccount(account: AdapterAccount) {
      await prisma.account.create({
        data: {
          userId: account.userId,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token as string | undefined,
          access_token: account.access_token as string | undefined,
          expires_at: account.expires_at as number | undefined,
          token_type: account.token_type as string | undefined,
          scope: account.scope as string | undefined,
          id_token: account.id_token as string | undefined,
          session_state:
            account.session_state == null ? undefined : String(account.session_state),
        },
      });
    },
  } satisfies Adapter;
}
