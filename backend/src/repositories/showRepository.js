import { prisma } from '../config/db.js';

/**
 * Show repository for show scheduling and querying
 */
export async function findShows({ movieId, theatreId, screenId, date, page = 1, pageSize = 20 }) {
  const skip = (page - 1) * pageSize;
  const where = {
    status: 'SCHEDULED',
    startsAt: { gte: new Date() },
  };

  if (movieId) where.movieId = movieId;
  if (screenId) where.screenId = screenId;
  if (theatreId) {
    where.screen = { theatreId };
  }

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    where.startsAt = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  const [total, shows] = await Promise.all([
    prisma.show.count({ where }),
    prisma.show.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { startsAt: 'asc' },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            durationMin: true,
            language: true,
            format: true,
            posterUrl: true,
          },
        },
        screen: {
          include: {
            theatre: true,
          },
        },
      },
    }),
  ]);

  return {
    data: shows,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function findShowById(id) {
  return prisma.show.findUnique({
    where: { id },
    include: {
      movie: true,
      screen: {
        include: {
          theatre: true,
          seats: {
            include: {
              category: true,
            },
            orderBy: [{ rowLabel: 'asc' }, { number: 'asc' }],
          },
        },
      },
      holds: {
        where: {
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
      },
      bookingSeats: {
        where: {
          active: true,
        },
      },
    },
  });
}

/**
 * Detects overlapping shows on the same screen.
 * Two shows overlap if: existing.startsAt < new.endsAt AND existing.endsAt > new.startsAt
 */
export async function checkShowOverlap(screenId, startsAt, endsAt, excludeShowId = null) {
  const where = {
    screenId,
    status: { not: 'CANCELLED' },
    AND: [
      { startsAt: { lt: new Date(endsAt) } },
      { endsAt: { gt: new Date(startsAt) } },
    ],
  };

  if (excludeShowId) {
    where.id = { not: excludeShowId };
  }

  return prisma.show.findFirst({
    where,
    include: {
      movie: {
        select: { title: true },
      },
    },
  });
}

export async function createShow(data) {
  return prisma.show.create({
    data: {
      movieId: data.movieId,
      screenId: data.screenId,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      status: data.status || 'SCHEDULED',
    },
    include: {
      movie: true,
      screen: {
        include: {
          theatre: true,
        },
      },
    },
  });
}

export async function updateShow(id, data) {
  const updatePayload = {};
  if (data.movieId) updatePayload.movieId = data.movieId;
  if (data.screenId) updatePayload.screenId = data.screenId;
  if (data.startsAt) updatePayload.startsAt = new Date(data.startsAt);
  if (data.endsAt) updatePayload.endsAt = new Date(data.endsAt);
  if (data.status) updatePayload.status = data.status;

  return prisma.show.update({
    where: { id },
    data: updatePayload,
    include: {
      movie: true,
      screen: {
        include: {
          theatre: true,
        },
      },
    },
  });
}

export async function deleteShow(id) {
  return prisma.show.delete({
    where: { id },
  });
}
