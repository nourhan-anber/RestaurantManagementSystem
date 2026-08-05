import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth';
import { db } from '@/server/db';
import { ChangePasswordForm, ProfileNameForm } from './profile-forms';

export const metadata: Metadata = { title: 'Your account · Mise' };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });
  if (!user) redirect('/login');

  const home = session.user.memberships?.[0]?.restaurantSlug
    ? `/r/${session.user.memberships[0].restaurantSlug}`
    : '/';

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href={home} className="text-sm text-muted hover:text-foreground">
        ← Back
      </Link>
      <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">Your account</h1>

      <section className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-5">
        <h2 className="font-display text-lg text-foreground">Profile</h2>
        <div className="mt-4">
          <ProfileNameForm name={user.name ?? ''} email={user.email} />
        </div>
      </section>

      <section className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-5">
        <h2 className="font-display text-lg text-foreground">Change password</h2>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </section>
    </main>
  );
}
