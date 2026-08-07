import type { Role } from "@/app/generated/prisma/client";
import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

/**
 * Module augmentation so `role`/`phone`/`id` are typed everywhere
 * NextAuth hands us a session, JWT, or user — instead of casting
 * `as any` at every call site.
 */
declare module "next-auth" {
  interface User extends DefaultUser {
    role: Role;
    phone: string | null;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      phone: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
  }
}
