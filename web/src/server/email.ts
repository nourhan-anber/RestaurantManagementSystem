import type { EmailContent } from '@/lib/email-templates';

export interface EmailMessage extends EmailContent {
  to: string;
}

/** Transactional email is configured when a Resend API key is present. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || 'onboarding@resend.dev';
}

/**
 * Send a transactional email through Resend when configured; otherwise log it to
 * the console in development and no-op in production. Best-effort by design — email
 * must never fail the request that triggered it, so this never throws. Returns
 * whether the message was actually handed to the provider.
 *
 * Guarded provider (mirrors getStripe/getStorageProvider/getDeliveryProvider): with
 * no RESEND_API_KEY the app runs fully without sending mail, keeping dev/tests green.
 */
export async function sendEmail(msg: EmailMessage): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[email:dev] to=${msg.to} · ${msg.subject}\n${msg.text}\n`);
    }
    return { sent: false };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromAddress(),
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      }),
    });
    if (!res.ok) {
      console.error(`[email] provider responded ${res.status}`);
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error('[email] send failed', err);
    return { sent: false };
  }
}
