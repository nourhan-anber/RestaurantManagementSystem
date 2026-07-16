import { db } from '@/server/db';
import { verifyTableToken } from '@/server/table-token';
import { CustomerMenu, type CustomerMenuItem } from './customer-menu';

export default async function DinePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; tableNumber: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug, tableNumber } = await params;
  const { token } = await searchParams;
  const number = Number(tableNumber);

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  const table =
    restaurant && Number.isInteger(number)
      ? await db.table.findFirst({ where: { restaurantId: restaurant.id, number, isActive: true } })
      : null;

  const valid = Boolean(
    restaurant && table && token && verifyTableToken(restaurant.id, table.id, token),
  );

  if (!valid || !restaurant) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6 text-center">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.3em] text-ember">Mise</p>
          <h1 className="mt-3 font-display text-2xl text-foreground">This link isn&rsquo;t valid</h1>
          <p className="mt-2 max-w-xs text-sm text-muted">
            Please scan the QR code on your table again, or ask a server for help.
          </p>
        </div>
      </main>
    );
  }

  const items = await db.menuItem.findMany({
    where: { restaurantId: restaurant.id, isAvailable: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  const menu: CustomerMenuItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    description: i.description,
    price: Number(i.price),
  }));

  return (
    <CustomerMenu
      restaurantName={restaurant.name}
      slug={slug}
      tableNumber={number}
      token={token!}
      menu={menu}
    />
  );
}
