import { prisma } from '../config/db.js';

/**
 * Finds all active and unexpired holds for the given seats in a show.
 * Expired holds (expiresAt <= now) are filtered out (lazy release).
 */
export async function findActiveHoldsForSeats(showId, seatIds, tx = null) {
  const client = tx || prisma;
  const now = new Date();

  return client.seatHold.findMany({
    where: {
      showId,
      seatId: { in: seatIds },
      status: 'ACTIVE',
      expiresAt: { gt: now },
    },
    include: {
      seat: true,
    },
  });
}

/**
 * Finds user's active, unexpired holds for a specific show and seat selection.
 */
export async function findUserUnexpiredHolds({ showId, userId, seatIds = null, holdIds = null }, tx = null) {
  const client = tx || prisma;
  const now = new Date();

  const where = {
    showId,
    userId,
    status: 'ACTIVE',
    expiresAt: { gt: now },
  };

  if (seatIds && seatIds.length > 0) {
    where.seatId = { in: seatIds };
  }

  if (holdIds && holdIds.length > 0) {
    where.id = { in: holdIds };
  }

  return client.seatHold.findMany({
    where,
    include: {
      seat: {
        include: {
          category: true,
        },
      },
    },
  });
}

/**
 * Batch creates holds for seats in a show.
 */
export async function createHoldsForSeats(showId, seatIds, userId, expiresAt, tx = null) {
  const client = tx || prisma;
  const holdRecords = seatIds.map((seatId) => ({
    showId,
    seatId,
    userId,
    expiresAt,
    status: 'ACTIVE',
  }));

  // Create holds sequentially or via createMany
  await client.seatHold.createMany({
    data: holdRecords,
  });

  return client.seatHold.findMany({
    where: {
      showId,
      userId,
      seatId: { in: seatIds },
      status: 'ACTIVE',
      expiresAt,
    },
    include: {
      seat: {
        include: { category: true },
      },
    },
  });
}

/**
 * Updates status of holds to CONVERTED.
 */
export async function markHoldsConverted(holdIds, tx = null) {
  const client = tx || prisma;
  return client.seatHold.updateMany({
    where: {
      id: { in: holdIds },
    },
    data: {
      status: 'CONVERTED',
    },
  });
}
