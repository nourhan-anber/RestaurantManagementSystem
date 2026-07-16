import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth';
import { resolvePostLoginPath } from '@/server/auth-helpers';

export default async function Home() {
  const session = await auth();

  // Signed-in users go straight to their workspace (admin → /admin, owner/manager
  // → tenant overview, chef → kitchen, server → floor).
  if (session?.user) {
    redirect(
      resolvePostLoginPath({
        isPlatformAdmin: session.user.isPlatformAdmin,
        memberships: session.user.memberships,
      }),
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="w-full max-w-lg text-center">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-ember">Mise</p>
        <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
          Restaurant operations, in its place.
        </h1>
        <p className="mt-4 text-sm text-muted">
          Menu, tables, the kitchen pass, the floor, and QR ordering — one workspace for the whole
          service.
        </p>
        <div className="mt-10">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius)] bg-ember px-6 text-base font-medium text-white transition-colors hover:bg-ember-600"
          >
            Sign in →
          </Link>
        </div>
      </div>
    </main>
  );
}
