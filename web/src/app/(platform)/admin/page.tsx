import Link from 'next/link';
import { db } from '@/server/db';

export default async function AdminHome() {
  const restaurants = await db.restaurant.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      _count: { select: { memberships: true, tables: true, menuItems: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-foreground">Restaurants</h1>
          <p className="mt-1 text-sm text-muted">{restaurants.length} on the platform.</p>
        </div>
        <Link
          href="/admin/restaurants/new"
          className="inline-flex h-11 items-center justify-center rounded-[var(--radius)] bg-ember px-5 text-sm font-medium text-white transition-colors hover:bg-ember-600"
        >
          New restaurant
        </Link>
      </div>

      <ul className="mt-6 divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
        {restaurants.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-muted">
            No restaurants yet. Create the first one to get started.
          </li>
        ) : (
          restaurants.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium text-foreground">{r.name}</p>
                <p className="text-xs text-muted">/{r.slug}</p>
              </div>
              <div className="flex items-center gap-6 text-xs text-muted">
                <span>{r._count.memberships} staff</span>
                <span>{r._count.tables} tables</span>
                <span>{r._count.menuItems} items</span>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
