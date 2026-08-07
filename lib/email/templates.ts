/** Shared wrapper so every transactional email looks like it's from the same product. */
function emailShell(bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #18181b;">
      <p style="font-weight: 700; font-size: 18px; color: #4f46e5; margin-bottom: 24px;">HireLocal</p>
      ${bodyHtml}
      <p style="color: #a1a1aa; font-size: 12px; margin-top: 32px;">
        You're receiving this because a request was made on HireLocal using this email address.
      </p>
    </div>
  `;
}

export function passwordResetEmail(name: string, resetUrl: string) {
  const subject = "Reset your HireLocal password";
  const text =
    `Hi ${name},\n\n` +
    `Someone requested a password reset for your HireLocal account. ` +
    `If this was you, set a new password here:\n\n${resetUrl}\n\n` +
    `This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.\n\n` +
    `— HireLocal`;

  const html = emailShell(`
    <h2 style="font-size: 20px; margin: 0 0 16px;">Reset your password</h2>
    <p>Hi ${name},</p>
    <p>Someone requested a password reset for your HireLocal account. If this was you, click below to set a new one:</p>
    <p style="margin: 24px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Reset password
      </a>
    </p>
    <p style="color:#71717a;font-size:14px;">This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.</p>
  `);

  return { subject, text, html };
}
