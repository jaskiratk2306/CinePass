import { prisma } from '../config/db.js';

export async function findSeatCategories() {
  return prisma.seatCategory.findMany({
    orderBy: { basePrice: 'asc' },
  });
}

export async function findSeatCategoryById(id) {
  return prisma.seatCategory.findUnique({
    where: { id },
  });
}

export async function createSeatCategory({ name, basePrice }) {
  return prisma.seatCategory.create({
    data: {
      name,
      basePrice,
    },
  });
}

export async function updateSeatCategory(id, { name, basePrice }) {
  return prisma.seatCategory.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(basePrice !== undefined ? { basePrice } : {}),
    },
  });
}
