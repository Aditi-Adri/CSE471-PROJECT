import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/passwords";
import { checkRateLimit, getClientIp } from "@/lib/auth/rateLimit";
import { registerSchema } from "@/lib/validation/authSchemas";
import { issueReferralReward } from "@/lib/referrals/issueReferralReward";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * POST /api/auth/register
 *
 * Creates a User with a bcrypt-hashed password. Doesn't sign the user
 * in itself — the client follows up with `signIn("credentials", ...)`
 * so cookie issuance always goes through NextAuth's own flow rather
 * than a hand-rolled one here.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`register:${ip}`, 10, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many sign-up attempts. Please try again shortly." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid registration details.", issues: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const { name, email, phone, password, role, referralCode } = parsed.data;
  const normalizedPhone = phone ? phone : null;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return Response.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  if (normalizedPhone) {
    const existingPhone = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (existingPhone) {
      return Response.json(
        { error: "An account with this phone number already exists." },
        { status: 409 }
      );
    }
  }

  // MODULE 4 (Shiva): an unknown/mistyped referral code doesn't block
  // sign-up — it just means no referral reward gets issued. Looked up
  // before creating the account so a typo can't ever end up "referred
  // by yourself".
  const referrer = referralCode
    ? await prisma.user.findUnique({ where: { referralCode }, select: { id: true } })
    : null;

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { name, email, phone: normalizedPhone, passwordHash, role, referredById: referrer?.id ?? null },
    select: { id: true, name: true, email: true, role: true },
  });

  // The account is already created at this point — a failure issuing
  // the reward (e.g. generateCouponCode exhausting its retry budget)
  // shouldn't turn an otherwise-successful registration into a 500 the
  // client can't recover from (retrying would then hit "email already
  // in use"). Worst case, the new user just doesn't get their reward
  // and can be issued one manually later.
  let referralApplied = false;
  if (referrer) {
    try {
      await issueReferralReward(referrer.id, user.id);
      referralApplied = true;
    } catch (err) {
      console.error(`Failed to issue referral reward for new user ${user.id}:`, err);
    }
  }

  return Response.json({ user, referralApplied }, { status: 201 });
});
