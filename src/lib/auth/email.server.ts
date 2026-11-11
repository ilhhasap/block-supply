/**
 * Transactional email for auth (server-only), via the Resend HTTP API.
 *
 *   RESEND_API_KEY   enables sending (and turns on required email verification)
 *   EMAIL_FROM       sender, e.g. "Block Supply <no-reply@yourdomain.com>"
 *
 * Without RESEND_API_KEY nothing is sent: the message is logged to the server
 * console so local development works without an email provider.
 */
const apiKey = process.env.RESEND_API_KEY?.trim() || undefined;
const from = process.env.EMAIL_FROM?.trim() || "Block Supply <onboarding@resend.dev>";

/** True when a real email provider is configured. */
export const emailConfigured = Boolean(apiKey);

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  if (!apiKey) {
    console.log(`[email] (not sent — RESEND_API_KEY unset) to=${opts.to}\n${opts.subject}\n${opts.text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: opts.to, subject: opts.subject, text: opts.text, html: opts.html }),
  });
  if (!res.ok) {
    throw new Error(`Email provider rejected the message (${res.status})`);
  }
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function verificationEmail(url: string) {
  return {
    subject: "Verify your email for Block Supply",
    text: `Confirm your email to finish creating your account:\n\n${url}\n\nIf you did not sign up, ignore this message.`,
    html: `<p>Confirm your email to finish creating your account.</p><p><a href="${escapeHtml(url)}">Verify email</a></p><p>If you did not sign up, ignore this message.</p>`,
  };
}
