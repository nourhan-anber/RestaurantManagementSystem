import { describe, expect, it } from 'vitest';
import { escapeHtml, orderConfirmation, passwordReset, receipt, staffInvite } from './email-templates';

describe('escapeHtml', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeHtml(`<script>"&'`)).toBe('&lt;script&gt;&quot;&amp;&#39;');
  });
});

describe('orderConfirmation', () => {
  it('includes the order id, type, and total', () => {
    const m = orderConfirmation({ restaurantName: 'Bella', orderId: 7, orderType: 'PICKUP', total: 22.6 });
    expect(m.subject).toBe('Your Bella order #7');
    expect(m.text).toContain('Pickup');
    expect(m.text).toContain('$22.60');
    expect(m.html).toContain('Order #7');
    expect(m.text).not.toContain('Track your order');
  });

  it('adds a tracking link when a status URL is given, escaping the restaurant name', () => {
    const m = orderConfirmation({
      restaurantName: 'Bella & Sons',
      orderId: 8,
      orderType: 'DELIVERY',
      total: 30,
      statusUrl: 'https://x.test/order/bella/status/abc',
    });
    expect(m.text).toContain('Track your order: https://x.test/order/bella/status/abc');
    expect(m.html).toContain('href="https://x.test/order/bella/status/abc"');
    expect(m.html).toContain('Bella &amp; Sons');
  });
});

describe('receipt', () => {
  it('sums tip into the charged amount', () => {
    const m = receipt({ restaurantName: 'Bella', orderId: 3, total: 20, tip: 4 });
    expect(m.subject).toBe('Receipt · Bella order #3');
    expect(m.text).toContain('Tip: $4.00');
    expect(m.text).toContain('Charged: $24.00');
  });

  it('omits the tip line when there is no tip', () => {
    const m = receipt({ restaurantName: 'Bella', orderId: 3, total: 20 });
    expect(m.text).not.toContain('Tip:');
    expect(m.text).toContain('Charged: $20.00');
  });
});

describe('staffInvite', () => {
  it('includes the accept URL and lowercased role', () => {
    const m = staffInvite({ restaurantName: 'Bella', role: 'MANAGER', acceptUrl: 'https://x.test/accept-invite/tok' });
    expect(m.subject).toBe("You're invited to join Bella");
    expect(m.text).toContain('as a manager');
    expect(m.text).toContain('https://x.test/accept-invite/tok');
    expect(m.html).toContain('href="https://x.test/accept-invite/tok"');
  });
});

describe('passwordReset', () => {
  it('includes the reset URL', () => {
    const m = passwordReset({ resetUrl: 'https://x.test/reset/tok' });
    expect(m.subject).toBe('Reset your password');
    expect(m.text).toContain('https://x.test/reset/tok');
    expect(m.html).toContain('href="https://x.test/reset/tok"');
  });
});
