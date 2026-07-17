import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/server/auth';
import { can, findMembership } from '@/server/authz';
import { db } from '@/server/db';
import { listCustomers } from '@/server/services/customers';

export default async function CustomersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  const membership = session?.user ? findMembership(session.user.memberships, slug) : undefined;
  if (!membership || !can(membership.role, 'reports:view')) notFound();

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const customers = await listCustomers(db, restaurant.id);

  return (
    <div>
      <Link href={`/r/${slug}`} className="text-sm text-muted hover:text-foreground">
        ← Overview
      </Link>
      <h1 className="mt-2 font-display text-2xl tracking-tight text-foreground">Customers</h1>
      <p className="mt-1 text-sm text-muted">
        Built automatically from phone and email on orders — {customers.length} total.
      </p>

      {customers.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No customers yet. They appear here after their first order.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 text-right font-medium">Orders</th>
                <th className="px-4 py-3 text-right font-medium">Last order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 text-foreground">{c.name ?? <span className="text-muted">—</span>}</td>
                  <td className="px-4 py-3 tabular-nums text-foreground">{c.phone ?? <span className="text-muted">—</span>}</td>
                  <td className="px-4 py-3 text-foreground">{c.email ?? <span className="text-muted">—</span>}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">{c.orders}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">
                    {c.lastOrderAt ? c.lastOrderAt.toLocaleDateString('en-US') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
