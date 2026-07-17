import { afterEach, describe, expect, it, vi } from 'vitest';
import { isEmailConfigured, sendEmail } from './email';

const msg = { to: 'guest@x.test', subject: 'Hi', text: 'plain', html: '<p>plain</p>' };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('isEmailConfigured', () => {
  it('reflects the presence of a Resend key', () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect(isEmailConfigured()).toBe(false);
    vi.stubEnv('RESEND_API_KEY', 'key_1');
    expect(isEmailConfigured()).toBe(true);
  });
});

describe('sendEmail (unconfigured)', () => {
  it('logs to the console in dev and reports not sent, without calling fetch', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('NODE_ENV', 'development');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    expect(await sendEmail(msg)).toEqual({ sent: false });
    expect(log).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('is a silent no-op in production', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('NODE_ENV', 'production');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(await sendEmail(msg)).toEqual({ sent: false });
    expect(log).not.toHaveBeenCalled();
  });
});

describe('sendEmail (configured)', () => {
  it('POSTs to Resend with auth + payload and reports sent on a 2xx', async () => {
    vi.stubEnv('RESEND_API_KEY', 'key_123');
    vi.stubEnv('EMAIL_FROM', 'from@x.test');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);

    expect(await sendEmail(msg)).toEqual({ sent: true });

    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((opts.headers as Record<string, string>).Authorization).toBe('Bearer key_123');
    expect(JSON.parse(opts.body as string)).toMatchObject({
      from: 'from@x.test',
      to: 'guest@x.test',
      subject: 'Hi',
      text: 'plain',
      html: '<p>plain</p>',
    });
  });

  it('defaults the from address when EMAIL_FROM is unset', async () => {
    vi.stubEnv('RESEND_API_KEY', 'key_123');
    vi.stubEnv('EMAIL_FROM', '');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);

    await sendEmail(msg);
    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(opts.body as string).from).toBe('onboarding@resend.dev');
  });

  it('reports not sent on a non-2xx response', async () => {
    vi.stubEnv('RESEND_API_KEY', 'key_123');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await sendEmail(msg)).toEqual({ sent: false });
  });

  it('never throws when the request rejects', async () => {
    vi.stubEnv('RESEND_API_KEY', 'key_123');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await sendEmail(msg)).toEqual({ sent: false });
  });
});
