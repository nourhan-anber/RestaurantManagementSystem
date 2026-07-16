import Link from 'next/link';
import { db } from '@/server/db';
import { hashInviteToken } from '@/server/services/staff';
import { AcceptInviteForm } from './accept-invite-form';

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await db.staffInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { restaurant: { select: { name: true } } },
  });
  const invalid = !invite || invite.acceptedAt !== null || invite.expiresAt < new Date();

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {invalid ? (
          <div className="text-center">
            <h1 className="font-display text-2xl text-foreground">Invite unavailable</h1>
            <p className="mt-2 text-sm text-muted">
              This invite link is invalid, expired, or already used.
            </p>
            <Link href="/login" className="mt-6 inline-block text-sm font-medium text-ember-600">
              Go to sign in →
            </Link>
          </div>
        ) : (
          <>
            <p className="font-display text-xs uppercase tracking-[0.3em] text-ember">Mise</p>
            <h1 className="mt-3 font-display text-2xl tracking-tight text-foreground">
              Join {invite.restaurant.name}
            </h1>
            <p className="mt-2 text-sm text-muted">
              You&rsquo;re joining as{' '}
              <span className="font-medium text-foreground">{invite.role.toLowerCase()}</span>. Set a
              password to finish.
            </p>
            <div className="mt-8">
              <AcceptInviteForm token={token} email={invite.email} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
