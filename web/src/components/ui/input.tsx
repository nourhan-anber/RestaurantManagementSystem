import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, type = 'text', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'h-11 w-full rounded-[var(--radius)] border border-border bg-surface px-3.5 text-sm text-foreground',
        'shadow-sm transition-colors placeholder:text-muted/70',
        'focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/30',
        'disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}
