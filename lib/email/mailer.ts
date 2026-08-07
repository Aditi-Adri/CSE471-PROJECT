import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Sends a transactional email via Resend (resend.com — free tier, no
 * SMTP setup, works out of the box in serverless).
 *
 * If RESEND_API_KEY isn't set yet, the email is printed to the server
 * console instead of thrown away — so registration and password-reset
 * still work end-to-end while you're wiring up the real API key (the
 * reset link shows up in the terminal running `npm run dev`).
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const { to, subject, html, text } = params;

  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY not set — printing instead of sending.\n` +
        `To: ${to}\nSubject: ${subject}\n\n${text}\n`
    );
    return;
  }

  const from = process.env.EMAIL_FROM ?? "HireLocal <onboarding@resend.dev>";
  const { error } = await resend.emails.send({ from, to, subject, html, text });
  if (error) {
    throw new Error(`Failed to send email via Resend: ${error.message}`);
  }
}
