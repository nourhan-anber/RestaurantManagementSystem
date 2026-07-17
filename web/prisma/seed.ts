import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { DietaryTag, Role } from '../src/generated/prisma/enums';

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

// Category display order (position = index).
const CATEGORIES = ['main-course', 'appetizers', 'desserts', 'drinks'];

interface SeedGroup {
  name: string;
  minSelect: number;
  maxSelect: number | null;
  options: Array<{ name: string; priceDelta: string }>;
}
interface SeedMenuItem {
  category: string;
  name: string;
  description: string;
  price: string;
  dietaryTags?: DietaryTag[];
  spiceLevel?: number;
  modifierGroups?: SeedGroup[];
}

const MENU: SeedMenuItem[] = [
  {
    category: 'main-course', name: 'Truffle Mushroom Risotto',
    description: 'Creamy Arborio rice with wild mushrooms, white truffle oil, and aged Parmesan.',
    price: '24.00', dietaryTags: [DietaryTag.VEGETARIAN, DietaryTag.GLUTEN_FREE],
  },
  {
    category: 'main-course', name: 'Pan-Seared Sea Bass',
    description: 'Fresh sea bass fillet served with asparagus, roasted cherry tomatoes, and lemon butter sauce.',
    price: '32.00', dietaryTags: [DietaryTag.GLUTEN_FREE],
  },
  {
    category: 'main-course', name: 'Wagyu Beef Burger',
    description: 'Premium Wagyu beef patty, caramelized onions, gruyere cheese, and truffle mayo on a brioche bun.',
    price: '28.00',
    modifierGroups: [
      {
        name: 'Cook', minSelect: 1, maxSelect: 1,
        options: [
          { name: 'Medium-rare', priceDelta: '0' },
          { name: 'Medium', priceDelta: '0' },
          { name: 'Well done', priceDelta: '0' },
        ],
      },
      {
        name: 'Add-ons', minSelect: 0, maxSelect: null,
        options: [
          { name: 'Extra cheese', priceDelta: '2.00' },
          { name: 'Bacon', priceDelta: '3.00' },
          { name: 'Fried egg', priceDelta: '2.50' },
        ],
      },
    ],
  },
  {
    category: 'main-course', name: 'Classic Margherita Pizza',
    description: 'San Marzano tomato sauce, fresh mozzarella, basil leaves, and extra virgin olive oil.',
    price: '18.00', dietaryTags: [DietaryTag.VEGETARIAN],
    modifierGroups: [
      {
        name: 'Size', minSelect: 1, maxSelect: 1,
        options: [
          { name: 'Personal', priceDelta: '0' },
          { name: 'Regular', priceDelta: '4.00' },
          { name: 'Large', priceDelta: '8.00' },
        ],
      },
    ],
  },
  {
    category: 'appetizers', name: 'Truffle Fries',
    description: 'Crispy french fries tossed with truffle oil and freshly grated Parmesan.',
    price: '9.00', dietaryTags: [DietaryTag.VEGETARIAN],
  },
  {
    category: 'appetizers', name: 'Burrata Caprese',
    description: 'Creamy burrata with heirloom tomatoes, fresh basil, and aged balsamic glaze.',
    price: '14.00', dietaryTags: [DietaryTag.VEGETARIAN, DietaryTag.GLUTEN_FREE],
  },
  {
    category: 'appetizers', name: 'Crispy Calamari',
    description: 'Lightly breaded calamari rings served with marinara and lemon aioli.',
    price: '13.00', spiceLevel: 1,
  },
  {
    category: 'desserts', name: 'Chocolate Lava Cake',
    description: 'Warm chocolate cake with a gooey molten center, served with vanilla bean ice cream.',
    price: '12.00', dietaryTags: [DietaryTag.VEGETARIAN],
  },
  {
    category: 'desserts', name: 'Tiramisu',
    description: 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone cream.',
    price: '11.00', dietaryTags: [DietaryTag.VEGETARIAN],
  },
  {
    category: 'desserts', name: 'Crème Brûlée',
    description: 'Silky vanilla custard topped with a perfectly caramelized sugar crust.',
    price: '10.00', dietaryTags: [DietaryTag.VEGETARIAN, DietaryTag.GLUTEN_FREE],
  },
  {
    category: 'drinks', name: 'Signature Lemonade',
    description: 'Freshly squeezed lemons with a hint of mint and agave nectar.',
    price: '5.00', dietaryTags: [DietaryTag.VEGAN, DietaryTag.GLUTEN_FREE],
  },
  {
    category: 'drinks', name: 'Sparkling Water',
    description: 'Premium Italian sparkling mineral water, 750ml.',
    price: '4.00', dietaryTags: [DietaryTag.VEGAN, DietaryTag.GLUTEN_FREE],
  },
  {
    category: 'drinks', name: 'Espresso Martini',
    description: 'Vodka, fresh espresso, coffee liqueur, and a touch of vanilla syrup.',
    price: '14.00', dietaryTags: [DietaryTag.GLUTEN_FREE],
  },
];

async function main() {
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

  const branding = {
    description: 'Modern Italian — wood-fired pizza, fresh pasta, and cocktails.',
    phone: '+1 212 555 0100',
    address: '12 Vine Street, New York, NY 10012',
    timezone: 'America/New_York',
    onlineOrderingEnabled: true,
    taxEnabled: true,
    taxRegion: 'CA-ON',
    taxRatePercent: 13,
    taxLabel: 'HST',
  };
  const restaurant = await db.restaurant.upsert({
    where: { slug: 'bella-vista' },
    update: branding,
    create: { name: 'Bella Vista', slug: 'bella-vista', ...branding },
  });

  // Opening hours: 11:00–22:00 daily, closed Mondays (day 1).
  for (let day = 0; day < 7; day += 1) {
    await db.openingHours.upsert({
      where: { restaurantId_dayOfWeek: { restaurantId: restaurant.id, dayOfWeek: day } },
      update: { opensMinutes: 660, closesMinutes: 1320, isClosed: day === 1 },
      create: { restaurantId: restaurant.id, dayOfWeek: day, opensMinutes: 660, closesMinutes: 1320, isClosed: day === 1 },
    });
  }

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

  for (const t of TABLES) {
    await db.table.upsert({
      where: { restaurantId_number: { restaurantId: restaurant.id, number: t.number } },
      update: { capacity: t.capacity },
      create: { restaurantId: restaurant.id, number: t.number, capacity: t.capacity },
    });
  }

  // Categories (idempotent on [restaurantId, name]); position = display order.
  const categoryIdByName = new Map<string, number>();
  for (let i = 0; i < CATEGORIES.length; i += 1) {
    const cat = await db.menuCategory.upsert({
      where: { restaurantId_name: { restaurantId: restaurant.id, name: CATEGORIES[i] } },
      update: { position: i, isHidden: false },
      create: { restaurantId: restaurant.id, name: CATEGORIES[i], position: i },
    });
    categoryIdByName.set(cat.name, cat.id);
  }

  // Menu items (no unique on name -> find-or-update) + modifier groups (clear & recreate).
  let groupCount = 0;
  for (const item of MENU) {
    const categoryId = categoryIdByName.get(item.category)!;
    const data = {
      categoryId,
      name: item.name,
      description: item.description,
      price: item.price,
      dietaryTags: item.dietaryTags ?? [],
      spiceLevel: item.spiceLevel ?? 0,
    };
    const existing = await db.menuItem.findFirst({
      where: { restaurantId: restaurant.id, name: item.name },
    });
    const saved = existing
      ? await db.menuItem.update({ where: { id: existing.id }, data })
      : await db.menuItem.create({ data: { ...data, restaurantId: restaurant.id } });

    await db.modifierGroup.deleteMany({ where: { menuItemId: saved.id } });
    if (item.modifierGroups) {
      for (let gi = 0; gi < item.modifierGroups.length; gi += 1) {
        const g = item.modifierGroups[gi];
        await db.modifierGroup.create({
          data: {
            menuItemId: saved.id,
            name: g.name,
            minSelect: g.minSelect,
            maxSelect: g.maxSelect,
            position: gi,
            options: {
              create: g.options.map((o, oi) => ({ name: o.name, priceDelta: o.priceDelta, position: oi })),
            },
          },
        });
        groupCount += 1;
      }
    }
  }

  console.log(
    `Seeded: "${restaurant.name}" (${restaurant.slug}) — ${CATEGORIES.length} categories, ` +
      `${TABLES.length} tables, ${MENU.length} menu items, ${groupCount} modifier groups, admin + owner.`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
