import { formatMoney } from '@/lib/format';

/** A rendered email: subject + both a plain-text and an HTML body. */
export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

/** Escape user-supplied text before interpolating it into HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Wrap body HTML in a minimal, client-safe shell. */
function shell(bodyHtml: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f1a17;line-height:1.5">${bodyHtml}</div>`;
}

const TYPE_LABEL: Record<string, string> = { DINE_IN: 'Dine-in', PICKUP: 'Pickup', DELIVERY: 'Delivery' };

export interface OrderConfirmationInput {
  restaurantName: string;
  orderId: number;
  orderType: string;
  total: number;
  statusUrl?: string;
}

/** "We got your order" — sent to the guest email after a storefront order is placed. */
export function orderConfirmation(input: OrderConfirmationInput): EmailContent {
  const type = TYPE_LABEL[input.orderType] ?? input.orderType;
  const subject = `Your ${input.restaurantName} order #${input.orderId}`;
  const lines = [
    `Thanks for your order at ${input.restaurantName}!`,
    ``,
    `Order #${input.orderId} · ${type}`,
    `Total: ${formatMoney(input.total)}`,
    ...(input.statusUrl ? [``, `Track your order: ${input.statusUrl}`] : []),
  ];
  const html = shell(
    `<h2>Thanks for your order!</h2>` +
      `<p>${escapeHtml(input.restaurantName)} received your order.</p>` +
      `<p><strong>Order #${input.orderId}</strong> · ${escapeHtml(type)}<br>Total: ${formatMoney(input.total)}</p>` +
      (input.statusUrl
        ? `<p><a href="${escapeHtml(input.statusUrl)}">Track your order →</a></p>`
        : ''),
  );
  return { subject, text: lines.join('\n'), html };
}

export interface ReceiptInput {
  restaurantName: string;
  orderId: number;
  total: number;
  tip?: number;
}

/** Payment receipt — sent after an online payment is confirmed. */
export function receipt(input: ReceiptInput): EmailContent {
  const tip = input.tip ?? 0;
  const charged = Math.round((input.total + tip) * 100) / 100;
  const subject = `Receipt · ${input.restaurantName} order #${input.orderId}`;
  const text = [
    `Payment received — thank you!`,
    ``,
    `${input.restaurantName} · order #${input.orderId}`,
    ...(tip > 0 ? [`Tip: ${formatMoney(tip)}`] : []),
    `Charged: ${formatMoney(charged)}`,
  ].join('\n');
  const html = shell(
    `<h2>Payment received</h2>` +
      `<p>${escapeHtml(input.restaurantName)} · order #${input.orderId}</p>` +
      (tip > 0 ? `<p>Tip: ${formatMoney(tip)}</p>` : '') +
      `<p><strong>Charged: ${formatMoney(charged)}</strong></p>`,
  );
  return { subject, text, html };
}

export interface StaffInviteInput {
  restaurantName: string;
  role: string;
  acceptUrl: string;
}

/** Staff invitation with the accept link. */
export function staffInvite(input: StaffInviteInput): EmailContent {
  const role = input.role.toLowerCase();
  const subject = `You're invited to join ${input.restaurantName}`;
  const text = [
    `You've been invited to join ${input.restaurantName} as a ${role}.`,
    ``,
    `Accept your invitation: ${input.acceptUrl}`,
  ].join('\n');
  const html = shell(
    `<h2>You're invited</h2>` +
      `<p>You've been invited to join ${escapeHtml(input.restaurantName)} as a <strong>${escapeHtml(role)}</strong>.</p>` +
      `<p><a href="${escapeHtml(input.acceptUrl)}">Accept your invitation →</a></p>`,
  );
  return { subject, text, html };
}

export interface PasswordResetInput {
  resetUrl: string;
}

/** Password-reset email with the single-use reset link. */
export function passwordReset(input: PasswordResetInput): EmailContent {
  const subject = `Reset your password`;
  const text = [
    `We received a request to reset your password.`,
    ``,
    `Reset it here: ${input.resetUrl}`,
    ``,
    `If you didn't request this, you can safely ignore this email.`,
  ].join('\n');
  const html = shell(
    `<h2>Reset your password</h2>` +
      `<p>We received a request to reset your password.</p>` +
      `<p><a href="${escapeHtml(input.resetUrl)}">Reset your password →</a></p>` +
      `<p style="color:#7a716b;font-size:13px">If you didn't request this, you can safely ignore this email.</p>`,
  );
  return { subject, text, html };
}
