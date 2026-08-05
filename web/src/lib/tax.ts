export interface TaxPreset {
  code: string; // e.g. 'CA-ON'
  region: string; // human name, e.g. 'Ontario'
  label: string; // what shows on the receipt line, e.g. 'HST'
  ratePercent: number; // combined rate, e.g. 13 or 14.975
}

export const CUSTOM_TAX = 'custom';

/**
 * Canadian sales-tax presets (combined GST/HST/PST/QST as a single rate per the
 * "one rate per restaurant" model). Rates are sensible defaults an owner can
 * override via the Custom option in Settings.
 */
export const CA_TAX_PRESETS: readonly TaxPreset[] = [
  { code: 'CA-AB', region: 'Alberta', label: 'GST', ratePercent: 5 },
  { code: 'CA-BC', region: 'British Columbia', label: 'GST + PST', ratePercent: 12 },
  { code: 'CA-MB', region: 'Manitoba', label: 'GST + RST', ratePercent: 12 },
  { code: 'CA-NB', region: 'New Brunswick', label: 'HST', ratePercent: 15 },
  { code: 'CA-NL', region: 'Newfoundland and Labrador', label: 'HST', ratePercent: 15 },
  { code: 'CA-NS', region: 'Nova Scotia', label: 'HST', ratePercent: 14 },
  { code: 'CA-NT', region: 'Northwest Territories', label: 'GST', ratePercent: 5 },
  { code: 'CA-NU', region: 'Nunavut', label: 'GST', ratePercent: 5 },
  { code: 'CA-ON', region: 'Ontario', label: 'HST', ratePercent: 13 },
  { code: 'CA-PE', region: 'Prince Edward Island', label: 'HST', ratePercent: 15 },
  { code: 'CA-QC', region: 'Quebec', label: 'GST + QST', ratePercent: 14.975 },
  { code: 'CA-SK', region: 'Saskatchewan', label: 'GST + PST', ratePercent: 11 },
  { code: 'CA-YT', region: 'Yukon', label: 'GST', ratePercent: 5 },
];

export function findTaxPreset(code: string | null | undefined): TaxPreset | undefined {
  return code ? CA_TAX_PRESETS.find((p) => p.code === code) : undefined;
}

/**
 * Resolve the effective rate + label from a region selection. A known preset's
 * rate/label win (server-authoritative); anything else ('custom' or unknown) uses
 * the supplied custom rate/label.
 */
export function resolveTaxConfig(
  region: string | null | undefined,
  customRatePercent: number,
  customLabel: string,
): { ratePercent: number; label: string; region: string } {
  const preset = findTaxPreset(region);
  if (preset) return { ratePercent: preset.ratePercent, label: preset.label, region: preset.code };
  return { ratePercent: customRatePercent, label: customLabel || 'Tax', region: CUSTOM_TAX };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface TaxBreakdown {
  subtotal: number;
  taxAmount: number;
  total: number;
}

/**
 * Add-on (tax-exclusive) sales tax on a pre-tax subtotal. When tax is disabled,
 * the rate is non-positive, or the subtotal is empty, no tax is applied and the
 * total equals the subtotal.
 */
export function computeTax(subtotal: number, ratePercent: number, enabled: boolean): TaxBreakdown {
  const sub = round2(subtotal);
  if (!enabled || ratePercent <= 0 || sub <= 0) {
    return { subtotal: sub, taxAmount: 0, total: sub };
  }
  const taxAmount = round2(sub * (ratePercent / 100));
  return { subtotal: sub, taxAmount, total: round2(sub + taxAmount) };
}
