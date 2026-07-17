export type StorefrontTemplate = 'classic' | 'hero' | 'banner';

export const STOREFRONT_TEMPLATES: ReadonlyArray<{
  id: StorefrontTemplate;
  label: string;
  description: string;
}> = [
  { id: 'classic', label: 'Classic', description: 'Compact header with your logo beside the menu.' },
  { id: 'hero', label: 'Hero', description: 'Large centered logo and name above the menu.' },
  { id: 'banner', label: 'Banner', description: 'Bold accent-colored band across the top.' },
];

export function isStorefrontTemplate(value: string): value is StorefrontTemplate {
  return value === 'classic' || value === 'hero' || value === 'banner';
}

export const DEFAULT_THEME_COLOR = '#d8622d';

/** Expand/validate a hex color to canonical #rrggbb (lowercase), or null. */
export function normalizeHex(hex: string): string | null {
  const s = hex.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s)) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  return null;
}

export function isValidHexColor(hex: string): boolean {
  return normalizeHex(hex) !== null;
}

/** Darken a hex color by a fraction (0–1), for a button's hover/pressed shade. */
export function darkenHex(hex: string, amount = 0.12): string {
  const norm = normalizeHex(hex);
  if (!norm) return hex;
  const n = parseInt(norm.slice(1), 16);
  const scale = (channel: number) => Math.max(0, Math.min(255, Math.round(channel * (1 - amount))));
  const r = scale((n >> 16) & 255);
  const g = scale((n >> 8) & 255);
  const b = scale(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
