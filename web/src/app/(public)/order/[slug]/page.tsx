import { notFound } from 'next/navigation';
import { db } from '@/server/db';
import { getOpeningHours } from '@/server/services/restaurants';
import { isOnlinePaymentConfigured } from '@/server/stripe';
import { isOpenNow, type DayHours } from '@/lib/hours';
import type { CustomerMenuItem } from '../../dine/[slug]/[tableNumber]/customer-menu';
import { StorefrontMenu } from './storefront-menu';

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { slug } = await params;
  const { paid } = await searchParams;

  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant || !restaurant.onlineOrderingEnabled) notFound();

  const [items, hoursRows] = await Promise.all([
    db.menuItem.findMany({
      where: { restaurantId: restaurant.id, isAvailable: true, category: { isHidden: false } },
      orderBy: [{ category: { position: 'asc' } }, { name: 'asc' }],
      include: {
        category: { select: { name: true } },
        modifierGroups: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            name: true,
            minSelect: true,
            maxSelect: true,
            options: {
              where: { isAvailable: true },
              orderBy: { position: 'asc' },
              select: { id: true, name: true, priceDelta: true },
            },
          },
        },
      },
    }),
    getOpeningHours(db, restaurant.id),
  ]);

  const menu: CustomerMenuItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category.name,
    description: i.description,
    price: Number(i.price),
    imageUrl: i.imageUrl,
    dietaryTags: i.dietaryTags,
    spiceLevel: i.spiceLevel,
    groups: i.modifierGroups.map((g) => ({
      id: g.id,
      name: g.name,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      options: g.options.map((o) => ({ id: o.id, name: o.name, priceDelta: Number(o.priceDelta) })),
    })),
  }));

  const hours: DayHours[] = hoursRows.map((h) => ({
    dayOfWeek: h.dayOfWeek,
    opensMinutes: h.opensMinutes,
    closesMinutes: h.closesMinutes,
    isClosed: h.isClosed,
  }));

  return (
    <StorefrontMenu
      slug={slug}
      restaurantName={restaurant.name}
      description={restaurant.description}
      logoUrl={restaurant.logoUrl}
      phone={restaurant.phone}
      address={restaurant.address}
      open={isOpenNow(hours, new Date(), restaurant.timezone)}
      hours={hours}
      canDeliver={Boolean(restaurant.address)}
      onlinePayment={isOnlinePaymentConfigured()}
      paid={paid === '1'}
      taxEnabled={restaurant.taxEnabled ?? false}
      taxRatePercent={Number(restaurant.taxRatePercent ?? 0)}
      taxLabel={restaurant.taxLabel ?? 'Tax'}
      template={restaurant.storefrontTemplate ?? 'classic'}
      themeColor={restaurant.themeColor ?? '#d8622d'}
      menu={menu}
    />
  );
}
