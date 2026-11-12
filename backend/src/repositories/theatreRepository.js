import { prisma } from '../config/db.js';

export async function findTheatres() {
  return prisma.theatre.findMany({
    orderBy: { name: 'asc' },
    include: {
      screens: {
        include: {
          _count: {
            select: { seats: true },
          },
        },
      },
    },
  });
}

export async function findTheatreById(id) {
  return prisma.theatre.findUnique({
    where: { id },
    include: {
      screens: {
        include: {
          _count: {
            select: { seats: true },
          },
        },
      },
    },
  });
}

export async function createTheatre({ name, city }) {
  return prisma.theatre.create({
    data: { name, city },
  });
}

export async function updateTheatre(id, { name, city }) {
  return prisma.theatre.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(city ? { city } : {}),
    },
  });
}

export async function deleteTheatre(id) {
  return prisma.theatre.delete({
    where: { id },
  });
}
