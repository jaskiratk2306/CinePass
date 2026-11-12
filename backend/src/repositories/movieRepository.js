import { prisma } from '../config/db.js';

/**
 * Movie Repository for querying and persisting movies and genres
 */
export async function findMovies({ q, genre, language, status, page = 1, pageSize = 10 }) {
  const skip = (page - 1) * pageSize;
  const where = {};

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (language) {
    where.language = { equals: language, mode: 'insensitive' };
  }

  if (status) {
    where.status = status;
  }

  if (genre) {
    where.genres = {
      some: {
        genre: {
          name: { equals: genre, mode: 'insensitive' },
        },
      },
    };
  }

  const [total, movies] = await Promise.all([
    prisma.movie.count({ where }),
    prisma.movie.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
      },
    }),
  ]);

  const data = movies.map((m) => ({
    ...m,
    genres: m.genres.map((g) => g.genre.name),
  }));

  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function findMovieById(id) {
  const movie = await prisma.movie.findUnique({
    where: { id },
    include: {
      genres: {
        include: {
          genre: true,
        },
      },
      shows: {
        where: {
          startsAt: { gte: new Date() },
          status: 'SCHEDULED',
        },
        orderBy: { startsAt: 'asc' },
        include: {
          screen: {
            include: {
              theatre: true,
            },
          },
        },
      },
    },
  });

  if (!movie) return null;

  return {
    ...movie,
    genres: movie.genres.map((g) => g.genre.name),
  };
}

export async function createMovie(movieData, genreIds = []) {
  return prisma.movie.create({
    data: {
      ...movieData,
      genres: {
        create: genreIds.map((genreId) => ({ genreId })),
      },
    },
    include: {
      genres: {
        include: {
          genre: true,
        },
      },
    },
  });
}

export async function updateMovie(id, movieData, genreIds = null) {
  const updateData = { ...movieData };

  if (genreIds !== null) {
    // Delete existing genres relation and recreate
    await prisma.movieGenre.deleteMany({ where: { movieId: id } });
    updateData.genres = {
      create: genreIds.map((genreId) => ({ genreId })),
    };
  }

  return prisma.movie.update({
    where: { id },
    data: updateData,
    include: {
      genres: {
        include: {
          genre: true,
        },
      },
    },
  });
}

export async function deleteMovie(id) {
  return prisma.movie.delete({
    where: { id },
  });
}
