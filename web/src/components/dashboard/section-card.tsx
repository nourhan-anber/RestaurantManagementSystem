import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface SectionCardProps {
  label: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
}

export function SectionCard({ label, description, href, comingSoon }: SectionCardProps) {
  const linked = Boolean(href) && !comingSoon;

  const body = (
    <div
      className={cn(
        'h-full rounded-[var(--radius)] border border-border bg-surface p-5 transition-colors',
        linked && 'hover:border-ember',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg text-foreground">{label}</h3>
        {comingSoon ? (
          <span className="rounded-full bg-clay/40 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-muted">
            soon
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-sm text-muted">{description}</p>
    </div>
  );

  if (linked && href) {
    return (
      <Link href={href} className="block h-full">
        {body}
      </Link>
    );
  }
  return body;
}
