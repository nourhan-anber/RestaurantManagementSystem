import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';
import type { PageInfo } from '@/lib/pagination';

/** Prev/next pagination that preserves the other query params (search, dates). */
export function Pager({
  basePath,
  params,
  info,
  total,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  info: PageInfo;
  total: number;
}) {
  const href = (page: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set('page', String(page));
    return `${basePath}?${sp.toString()}`;
  };
  const disabled = `${buttonClasses({ size: 'sm', variant: 'ghost' })} pointer-events-none opacity-40`;

  return (
    <div className="mt-4 flex items-center justify-between gap-4 text-sm text-muted">
      <span>{total === 0 ? 'No results' : `${info.from}–${info.to} of ${total}`}</span>
      <div className="flex items-center gap-2">
        {info.hasPrev ? (
          <Link href={href(info.page - 1)} className={buttonClasses({ size: 'sm', variant: 'ghost' })}>← Prev</Link>
        ) : (
          <span className={disabled}>← Prev</span>
        )}
        <span className="tabular-nums">
          {info.page} / {info.totalPages}
        </span>
        {info.hasNext ? (
          <Link href={href(info.page + 1)} className={buttonClasses({ size: 'sm', variant: 'ghost' })}>Next →</Link>
        ) : (
          <span className={disabled}>Next →</span>
        )}
      </div>
    </div>
  );
}
