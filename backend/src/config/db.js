import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

/**
 * Singleton Prisma Client instance to avoid multiple connection pools in development.
 */
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'test' ? [] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
