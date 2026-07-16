import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { listTables } from '@/server/services/tables';
import { generateTableToken } from '@/server/table-token';
import { TableManager } from './table-manager';

export default async function TablesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'table:write')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const tables = await listTables(db, restaurant.id);
  const base = process.env.AUTH_URL ?? '';
  const rows = tables.map((t) => ({
    id: t.id,
    number: t.number,
    capacity: t.capacity,
    status: t.status,
    isActive: t.isActive,
    qrUrl: `${base}/dine/${slug}/${t.number}?token=${generateTableToken(restaurant.id, t.id)}`,
  }));

  return <TableManager slug={slug} tables={rows} />;
}
