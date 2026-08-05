/** Escape a single CSV cell per RFC 4180 (quote when it contains `,` `"` or newline). */
function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Serialize a header row + data rows to CSV text (CRLF line endings, trailing CRLF). */
export function toCsv(headers: string[], rows: ReadonlyArray<ReadonlyArray<string | number | null>>): string {
  const all = [headers, ...rows];
  return all.map((row) => row.map(escapeCell).join(',')).join('\r\n') + '\r\n';
}

/** A number formatted for a CSV money cell — two decimals, no currency symbol. */
export function money(n: number): string {
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

/** A stable, machine-readable timestamp for a CSV cell. */
export function isoDate(d: Date): string {
  return d.toISOString();
}
