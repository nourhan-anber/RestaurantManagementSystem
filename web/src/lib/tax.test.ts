import { describe, expect, it } from 'vitest';
import {
  CA_TAX_PRESETS,
  CUSTOM_TAX,
  computeTax,
  findTaxPreset,
  resolveTaxConfig,
} from './tax';

describe('CA tax presets', () => {
  it('has unique codes and non-negative rates', () => {
    const codes = CA_TAX_PRESETS.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(CA_TAX_PRESETS.every((p) => p.ratePercent >= 0)).toBe(true);
  });

  it('looks up a known preset and misses unknown/empty', () => {
    expect(findTaxPreset('CA-ON')?.ratePercent).toBe(13);
    expect(findTaxPreset('CA-QC')?.label).toBe('GST + QST');
    expect(findTaxPreset('nope')).toBeUndefined();
    expect(findTaxPreset(null)).toBeUndefined();
  });
});

describe('resolveTaxConfig', () => {
  it('uses the preset rate/label for a known region (ignores custom values)', () => {
    expect(resolveTaxConfig('CA-ON', 99, 'Bogus')).toEqual({
      ratePercent: 13,
      label: 'HST',
      region: 'CA-ON',
    });
  });

  it('uses custom rate/label for the custom sentinel', () => {
    expect(resolveTaxConfig('custom', 8.25, 'City Tax')).toEqual({
      ratePercent: 8.25,
      label: 'City Tax',
      region: CUSTOM_TAX,
    });
  });

  it('falls back to custom for an unknown/blank region and defaults a blank label', () => {
    expect(resolveTaxConfig(null, 7, '')).toEqual({ ratePercent: 7, label: 'Tax', region: CUSTOM_TAX });
  });
});

describe('computeTax (add-on / exclusive)', () => {
  it('adds tax on top of the subtotal', () => {
    expect(computeTax(20, 13, true)).toEqual({ subtotal: 20, taxAmount: 2.6, total: 22.6 });
  });

  it('rounds the tax amount to cents (Quebec 14.975%)', () => {
    // 20 * 0.14975 = 2.995 -> 3.00
    expect(computeTax(20, 14.975, true)).toEqual({ subtotal: 20, taxAmount: 3, total: 23 });
    // 10.10 * 0.13 = 1.313 -> 1.31
    expect(computeTax(10.1, 13, true)).toEqual({ subtotal: 10.1, taxAmount: 1.31, total: 11.41 });
  });

  it('applies no tax when disabled, zero-rate, or empty', () => {
    expect(computeTax(20, 13, false)).toEqual({ subtotal: 20, taxAmount: 0, total: 20 });
    expect(computeTax(20, 0, true)).toEqual({ subtotal: 20, taxAmount: 0, total: 20 });
    expect(computeTax(0, 13, true)).toEqual({ subtotal: 0, taxAmount: 0, total: 0 });
  });
});
