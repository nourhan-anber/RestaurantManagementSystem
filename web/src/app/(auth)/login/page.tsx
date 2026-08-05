import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in · Mise',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col md:flex-row">
      {/* The pass — brand panel. Signature: a kitchen ticket rail down the seam. */}
      <section className="relative flex min-h-[40dvh] flex-col justify-between overflow-hidden bg-pine px-8 py-10 text-linen md:min-h-dvh md:w-[46%] md:px-14 md:py-16">
        <div className="flex items-center gap-3">
          <span className="font-display text-2xl font-semibold tracking-tight">Mise</span>
          <span className="text-[0.7rem] uppercase tracking-[0.25em] text-linen/60">
            Restaurant OS
          </span>
        </div>

        <div className="max-w-sm">
          <p className="font-display text-3xl leading-tight md:text-[2.6rem] md:leading-[1.1]">
            Everything in its place.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-linen/70">
            One workspace for the whole service — menu and tables, the kitchen pass, the floor,
            and orders straight from the guest&rsquo;s table.
          </p>
        </div>

        {/* Ticket rail — the perforated edge of a kitchen order ticket. */}
        <div className="hidden items-center gap-3 text-linen/50 md:flex" aria-hidden="true">
          <span className="h-px flex-1 [background:repeating-linear-gradient(90deg,currentColor_0_6px,transparent_6px_12px)]" />
          <span className="text-[0.7rem] uppercase tracking-[0.3em]">fire</span>
          <span className="h-px flex-1 [background:repeating-linear-gradient(90deg,currentColor_0_6px,transparent_6px_12px)]" />
        </div>
      </section>

      {/* Sign in */}
      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl tracking-tight text-foreground">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Sign in to your restaurant workspace.</p>

          <div className="mt-8">
            <LoginForm />
          </div>

          <p className="mt-10 rounded-[var(--radius)] border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
            <span className="font-medium text-foreground">Demo:</span> owner@bellavista.test /
            owner1234 · admin@platform.test / admin1234
          </p>
        </div>
      </section>
    </main>
  );
}
