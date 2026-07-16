import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { StaffManager } from './staff-manager';

export default async function StaffPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'staff:manage')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const [members, invites] = await Promise.all([
    db.membership.findMany({
      where: { restaurantId: restaurant.id },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    db.staffInvite.findMany({
      where: { restaurantId: restaurant.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <StaffManager
      slug={slug}
      members={members.map((m) => ({
        id: m.id,
        role: m.role,
        name: m.user.name,
        email: m.user.email,
      }))}
      invites={invites.map((i) => ({ id: i.id, email: i.email, role: i.role }))}
    />
  );
}
