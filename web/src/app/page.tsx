import Link from 'next/link';
import { auth, signOut } from '@/server/auth';
import { Button } from '@/components/ui/button';

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="w-full max-w-lg text-center">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-ember">Mise</p>
        <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
          Restaurant operations, in its place.
        </h1>

        {session?.user ? (
          <div className="mt-10 space-y-5">
            <p className="text-sm text-muted">
              Signed in as{' '}
              <span className="font-medium text-foreground">{session.user.email}</span>
              {session.user.isPlatformAdmin ? ' · platform admin' : ''}
            </p>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
            >
              <Button variant="secondary" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        ) : (
          <div className="mt-10">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius)] bg-ember px-6 text-base font-medium text-white transition-colors hover:bg-ember-600"
            >
              Sign in →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
