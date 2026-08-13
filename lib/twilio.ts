/**
 * MODULE 1 -> FEATURE 3 (Jishan): SMS dispatch for the "technician is
 * ~10 min away" alert (see server.ts, which decides *when* to send and
 * calls this to actually do it).
 *
 * Mock only, by team decision — not a placeholder waiting on
 * credentials. Twilio requires a verified payment method before a
 * trial account can claim a phone number at all, even one paid for
 * out of trial credit, which conflicts with the free-APIs-only
 * constraint the rest of the stack follows (see
 * docs/FEATURE_SPEC.md's tech-stack table). The alert-trigger logic in
 * server.ts is fully real and fires on schedule; only this last-mile
 * "actually deliver the text" step is a log line instead of a real
 * send.
 */
export async function sendSms(to: string, body: string): Promise<void> {
  console.log(`📱 [SMS Mock] To: ${to} | Message: ${body}`);
}
