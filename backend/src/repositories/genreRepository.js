import { prisma } from '../config/db.js';

export async function findGenres() {
  return prisma.genre.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function createGenre(name) {
  return prisma.genre.create({
    data: { name },
  });
}

export async function deleteGenre(id) {
  return prisma.genre.delete({
    where: { id },
  });
}
