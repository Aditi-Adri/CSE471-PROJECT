import { prisma } from "@/lib/db";
import { classifyReviewWithGroq } from "./groqFraudCheck";
import { scoreReviewHeuristically } from "./fraudHeuristic";
import type { FraudCheckMethod } from "@/app/generated/prisma/client";

/**
 * MODULE 2 -> FEATURE 1 (Shiva): Review Fraud Detection — orchestrator.
 *
 * Same two-tier strategy as lib/ai/categoryMapper.ts:
 *   1. If GROQ_API_KEY is configured, try the free Groq API first.
 *   2. Otherwise — or if that call fails/times out/is inconclusive —
 *      fall back to the local heuristic (fraudHeuristic.ts), which is
 *      free, instant, and has no external dependency at all.
 *
 * On top of whichever score came back, a database-backed duplicate
 * check runs unconditionally: a comment that's a near-exact repeat of
 * one already on this worker's page is a strong fraud signal no matter
 * which path scored it, and it's the one check that genuinely needs
 * the database (which is why it isn't in the pure heuristic module).
 *
 * Runs synchronously on every submitted review (see
 * app/api/bookings/[id]/review/route.ts) — never blocks the review
 * from being saved, only decides whether it's flagged.
 */

const FRAUD_THRESHOLD = 0.5;
const MIN_LENGTH_FOR_DUPLICATE_CHECK = 8;

export type FraudCheckResult = {
  fraudFlagged: boolean;
  fraudScore: number;
  fraudReason: string;
  fraudMethod: FraudCheckMethod;
};

export async function detectReviewFraud(input: {
  rating: number;
  comment: string;
  workerId: string;
}): Promise<FraudCheckResult> {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  let score: number;
  let reason: string;
  let method: FraudCheckMethod;

  const aiResult = apiKey
    ? await classifyReviewWithGroq({ rating: input.rating, comment: input.comment }, { apiKey })
    : null;

  if (aiResult) {
    score = aiResult.score;
    reason = aiResult.reason;
    method = "AI";
  } else {
    const heuristic = scoreReviewHeuristically(input);
    score = heuristic.score;
    reason = heuristic.reasons[0] ?? "Passed automated screening — no red flags found.";
    method = "HEURISTIC";
  }

  if (await hasDuplicateComment(input.comment, input.workerId)) {
    score = Math.max(score, 0.75);
    reason = "Near-identical comment already exists for this worker.";
  }

  return {
    fraudFlagged: score >= FRAUD_THRESHOLD,
    fraudScore: Math.round(score * 100) / 100,
    fraudReason: reason,
    fraudMethod: method,
  };
}

async function hasDuplicateComment(comment: string, workerId: string): Promise<boolean> {
  const normalized = comment.trim();
  if (normalized.length < MIN_LENGTH_FOR_DUPLICATE_CHECK) return false;

  const existing = await prisma.review.findFirst({
    where: { workerId, comment: { equals: normalized, mode: "insensitive" } },
    select: { id: true },
  });
  return Boolean(existing);
}
