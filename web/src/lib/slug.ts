/** URL-safe slug from a display name (diacritics stripped, lowercased, hyphenated). */
export function slugify(input: string): string {
  const base = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return base || 'restaurant';
}

/** A slug not already present in `taken`, appending -2, -3, … on collision. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  const slug = slugify(base);
  if (!taken.has(slug)) return slug;
  let n = 2;
  while (taken.has(`${slug}-${n}`)) n += 1;
  return `${slug}-${n}`;
}
