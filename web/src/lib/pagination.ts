export const DEFAULT_PAGE_SIZE = 20;

export interface Page {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

/** Parse a 1-based page number from a raw query value (defaults/clamps to >= 1). */
export function parsePage(raw: string | undefined, pageSize: number = DEFAULT_PAGE_SIZE): Page {
  const n = Math.floor(Number(raw));
  const page = Number.isFinite(n) && n >= 1 ? n : 1;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export interface PageInfo {
  page: number; // clamped to [1, totalPages]
  totalPages: number;
  from: number; // 1-based index of first row (0 when empty)
  to: number; // 1-based index of last row
  hasPrev: boolean;
  hasNext: boolean;
}

/** Derive display/navigation info for a page of `total` rows. */
export function pageInfo(total: number, page: number, pageSize: number): PageInfo {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clamped = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (clamped - 1) * pageSize + 1;
  const to = Math.min(clamped * pageSize, total);
  return { page: clamped, totalPages, from, to, hasPrev: clamped > 1, hasNext: clamped < totalPages };
}

/**
 * Turn `YYYY-MM-DD` date-input values into a UTC datetime range (inclusive of the
 * whole `to` day). Invalid/empty values are ignored.
 */
export function parseDateRange(from?: string, to?: string): { gte?: Date; lte?: Date } {
  const range: { gte?: Date; lte?: Date } = {};
  if (from) {
    const d = new Date(`${from}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) range.gte = d;
  }
  if (to) {
    const d = new Date(`${to}T23:59:59.999Z`);
    if (!Number.isNaN(d.getTime())) range.lte = d;
  }
  return range;
}
