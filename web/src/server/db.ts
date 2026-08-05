import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

type Db = InstanceType<typeof PrismaClient>;

// Reuse a single client across hot reloads in dev to avoid exhausting connections.
const globalForPrisma = globalThis as unknown as { prisma?: Db };

function createClient(): Db {
  // Prisma 7 uses a driver adapter for direct connections; the URL comes from env.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const db: Db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
