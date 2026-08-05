import type { Metadata } from 'next';
import { ResetForm } from './reset-form';

export const metadata: Metadata = { title: 'Set a new password · Mise' };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-ember">Mise</p>
        <h1 className="mt-3 font-display text-2xl tracking-tight text-foreground">Set a new password</h1>
        <p className="mt-2 text-sm text-muted">Choose a new password for your account.</p>
        <div className="mt-8">
          <ResetForm token={token} />
        </div>
      </div>
    </main>
  );
}
