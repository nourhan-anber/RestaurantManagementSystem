import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { Role } from '../src/generated/prisma/enums';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

// Demo credentials (dev only). Real deployments create accounts via the admin UI.
const ADMIN_EMAIL = 'admin@platform.test';
const ADMIN_PASSWORD = 'admin1234';
const OWNER_EMAIL = 'owner@bellavista.test';
const OWNER_PASSWORD = 'owner1234';

const TABLES: Array<{ number: number; capacity: number }> = [
  { number: 1, capacity: 4 }, { number: 2, capacity: 4 }, { number: 3, capacity: 2 },
  { number: 4, capacity: 6 }, { number: 5, capacity: 4 }, { number: 6, capacity: 4 },
  { number: 7, capacity: 8 }, { number: 8, capacity: 2 }, { number: 9, capacity: 4 },
  { number: 10, capacity: 4 }, { number: 11, capacity: 6 }, { number: 12, capacity: 4 },
];

const MENU: Array<{ category: string; name: string; description: string; price: string }> = [
  { category: 'main-course', name: 'Truffle Mushroom Risotto', description: 'Creamy Arborio rice with wild mushrooms, white truffle oil, and aged Parmesan.', price: '24.00' },
  { category: 'main-course', name: 'Pan-Seared Sea Bass', description: 'Fresh sea bass fillet served with asparagus, roasted cherry tomatoes, and lemon butter sauce.', price: '32.00' },
  { category: 'main-course', name: 'Wagyu Beef Burger', description: 'Premium Wagyu beef patty, caramelized onions, gruyere cheese, and truffle mayo on a brioche bun.', price: '28.00' },
  { category: 'main-course', name: 'Classic Margherita Pizza', description: 'San Marzano tomato sauce, fresh mozzarella, basil leaves, and extra virgin olive oil.', price: '18.00' },
  { category: 'appetizers', name: 'Truffle Fries', description: 'Crispy french fries tossed with truffle oil and freshly grated Parmesan.', price: '9.00' },
  { category: 'appetizers', name: 'Burrata Caprese', description: 'Creamy burrata with heirloom tomatoes, fresh basil, and aged balsamic glaze.', price: '14.00' },
  { category: 'appetizers', name: 'Crispy Calamari', description: 'Lightly breaded calamari rings served with marinara and lemon aioli.', price: '13.00' },
  { category: 'desserts', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with a gooey molten center, served with vanilla bean ice cream.', price: '12.00' },
  { category: 'desserts', name: 'Tiramisu', description: 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone cream.', price: '11.00' },
  { category: 'desserts', name: 'Crème Brûlée', description: 'Silky vanilla custard topped with a perfectly caramelized sugar crust.', price: '10.00' },
  { category: 'drinks', name: 'Signature Lemonade', description: 'Freshly squeezed lemons with a hint of mint and agave nectar.', price: '5.00' },
  { category: 'drinks', name: 'Sparkling Water', description: 'Premium Italian sparkling mineral water, 750ml.', price: '4.00' },
  { category: 'drinks', name: 'Espresso Martini', description: 'Vodka, fresh espresso, coffee liqueur, and a touch of vanilla syrup.', price: '14.00' },
];

async function main() {
  // Platform admin (cross-tenant, no membership).
  await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { isPlatformAdmin: true },
    create: {
      email: ADMIN_EMAIL,
      name: 'Platform Admin',
      isPlatformAdmin: true,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
    },
  });

  // Seed tenant.
  const restaurant = await db.restaurant.upsert({
    where: { slug: 'bella-vista' },
    update: {},
    create: { name: 'Bella Vista', slug: 'bella-vista' },
  });

  // Owner of the seed tenant.
  const owner = await db.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {},
    create: {
      email: OWNER_EMAIL,
      name: 'Bella Vista Owner',
      passwordHash: await bcrypt.hash(OWNER_PASSWORD, 10),
    },
  });
  await db.membership.upsert({
    where: { userId_restaurantId: { userId: owner.id, restaurantId: restaurant.id } },
    update: { role: Role.OWNER },
    create: { userId: owner.id, restaurantId: restaurant.id, role: Role.OWNER },
  });

  // Tables (idempotent on the [restaurantId, number] unique).
  for (const t of TABLES) {
    await db.table.upsert({
      where: { restaurantId_number: { restaurantId: restaurant.id, number: t.number } },
      update: { capacity: t.capacity },
      create: { restaurantId: restaurant.id, number: t.number, capacity: t.capacity },
    });
  }

  // Menu items (no unique on name -> find-or-update).
  for (const item of MENU) {
    const existing = await db.menuItem.findFirst({
      where: { restaurantId: restaurant.id, name: item.name },
    });
    if (existing) {
      await db.menuItem.update({ where: { id: existing.id }, data: item });
    } else {
      await db.menuItem.create({ data: { ...item, restaurantId: restaurant.id } });
    }
  }

  console.log(
    `Seeded: restaurant "${restaurant.name}" (${restaurant.slug}), ` +
      `${TABLES.length} tables, ${MENU.length} menu items, platform admin + owner.`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
