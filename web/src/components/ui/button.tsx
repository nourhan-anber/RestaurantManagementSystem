import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ember text-white shadow-sm hover:bg-ember-600',
  secondary: 'bg-pine text-linen hover:bg-pine-700',
  ghost: 'bg-transparent text-foreground hover:bg-black/5 dark:hover:bg-white/10',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** The button's classes, for styling a non-button element (e.g. a Link) the same way. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium',
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60',
    'disabled:pointer-events-none disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({ className, variant = 'primary', size = 'md', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
