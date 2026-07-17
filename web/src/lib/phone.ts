/**
 * Normalize a phone number to a canonical E.164-ish string, or null if it isn't a
 * plausible number. North American (NANP) numbers are the common case — 10 digits,
 * or 11 with a leading 1 — and are validated for real area/exchange codes (both
 * start 2–9). A leading '+' is treated as an international number (8–15 digits).
 * The canonical form is what we dedupe customers on, so "+1 (416) 555-0199",
 * "416-555-0199", and "14165550199" all collapse to "+14165550199".
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.indexOf('+') > 0) return null; // '+' only valid at the start
  const digits = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+')) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }

  let local = digits;
  if (local.length === 11 && local.startsWith('1')) local = local.slice(1);
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(local)) return null;
  return `+1${local}`;
}

export function isValidPhone(raw: string): boolean {
  return normalizePhone(raw) !== null;
}
