import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotForm } from './forgot-form';

export const metadata: Metadata = { title: 'Reset your password · Mise' };

export default function ForgotPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-ember">Mise</p>
        <h1 className="mt-3 font-display text-2xl tracking-tight text-foreground">Forgot your password?</h1>
        <p className="mt-2 text-sm text-muted">
          Enter your email and we&rsquo;ll send you a link to set a new one.
        </p>
        <div className="mt-8">
          <ForgotForm />
        </div>
        <Link href="/login" className="mt-8 inline-block text-sm font-medium text-ember-600">
          ← Back to sign in
        </Link>
      </div>
    </main>
  );
}
