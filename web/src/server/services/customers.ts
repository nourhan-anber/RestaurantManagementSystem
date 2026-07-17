import type { PrismaClient } from '@/generated/prisma/client';
import { normalizePhone } from '@/lib/phone';

/** Just the customer delegate — works with both the client and a $transaction tx. */
type CustomerClient = Pick<PrismaClient, 'customer'>;

export interface CustomerContact {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

/**
 * Find-or-create the customer behind an order and return its id (or null when
 * there's nothing to identify them by). Dedupe within the restaurant by normalized
 * phone first, then email; an existing match is enriched with any newly-supplied
 * name/phone/email it was missing. The phone is stored in canonical form; an
 * invalid phone is ignored (email may still identify the customer).
 */
export async function upsertCustomerForOrder(
  db: CustomerClient,
  restaurantId: number,
  contact: CustomerContact,
): Promise<number | null> {
  const phone = contact.phone ? normalizePhone(contact.phone) : null;
  const email = contact.email?.trim().toLowerCase() || null;
  const name = contact.name?.trim() || null;
  if (!phone && !email) return null;

  const existing = await db.customer.findFirst({
    where: {
      restaurantId,
      OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])],
    },
    orderBy: { id: 'asc' },
  });

  if (existing) {
    await db.customer.update({
      where: { id: existing.id },
      data: {
        name: existing.name ?? name,
        phone: existing.phone ?? phone,
        email: existing.email ?? email,
      },
    });
    return existing.id;
  }

  const created = await db.customer.create({
    data: { restaurantId, name, phone, email },
  });
  return created.id;
}

export interface CustomerRow {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  orders: number;
  lastOrderAt: Date | null;
}

export interface ListCustomersOptions {
  search?: string;
  skip?: number;
  take?: number;
}

/** Build the tenant-scoped where clause, matching name/email/phone on a search term. */
function customerWhere(restaurantId: number, search?: string) {
  const term = search?.trim();
  if (!term) return { restaurantId };
  const digits = term.replace(/\D/g, '');
  return {
    restaurantId,
    OR: [
      { name: { contains: term, mode: 'insensitive' as const } },
      { email: { contains: term, mode: 'insensitive' as const } },
      ...(digits ? [{ phone: { contains: digits } }] : []),
    ],
  };
}

/**
 * The restaurant's customer directory: newest customers first, optionally filtered
 * by a name/email/phone search and paginated. Returns the page rows plus the total
 * matching count (for pagination controls).
 */
export async function listCustomers(
  db: PrismaClient,
  restaurantId: number,
  opts: ListCustomersOptions = {},
): Promise<{ rows: CustomerRow[]; total: number }> {
  const where = customerWhere(restaurantId, opts.search);
  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: opts.skip,
      take: opts.take,
      include: {
        _count: { select: { orders: true } },
        orders: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
    }),
    db.customer.count({ where }),
  ]);

  const rows = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    orders: c._count.orders,
    lastOrderAt: c.orders[0]?.createdAt ?? null,
  }));
  return { rows, total };
}

/** A single customer, tenant-scoped (null if not found in this restaurant). */
export function getCustomer(db: PrismaClient, restaurantId: number, customerId: number) {
  return db.customer.findFirst({ where: { id: customerId, restaurantId } });
}
