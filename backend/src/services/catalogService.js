import { findMovies, findMovieById } from '../repositories/movieRepository.js';
import { findShows, findShowById } from '../repositories/showRepository.js';
import { NotFoundError } from '../errors/AppError.js';

/**
 * Public catalog service for browsing movies, shows, and real-time seat availability
 */
export async function listMovies(query) {
  return findMovies(query);
}

export async function getMovieDetails(id) {
  const movie = await findMovieById(id);
  if (!movie) {
    throw new NotFoundError('Movie not found', 'MOVIE_NOT_FOUND');
  }
  return movie;
}

export async function listShows(query) {
  return findShows(query);
}

/**
 * Computes live seat map for a show with lazy expiry of holds.
 * Seats can have status: AVAILABLE | HELD | BOOKED
 * Expired holds (expiresAt <= now) are treated as AVAILABLE lazily.
 * @param {string} showId
 * @param {string|null} [currentUserId]
 */
export async function getShowSeatMap(showId, currentUserId = null) {
  const show = await findShowById(showId);
  if (!show) {
    throw new NotFoundError('Show not found', 'SHOW_NOT_FOUND');
  }

  const now = new Date();

  // 1. Set of booked seat IDs (DB guaranteed active confirmed bookings)
  const bookedSeatIds = new Set(
    show.bookingSeats.map((bs) => bs.seatId)
  );

  // 2. Map of actively held seat IDs (strictly expiresAt > now and status = ACTIVE)
  const activeHoldsBySeatId = new Map();
  for (const hold of show.holds) {
    if (hold.status === 'ACTIVE' && new Date(hold.expiresAt) > now) {
      activeHoldsBySeatId.set(hold.seatId, hold);
    }
  }

  // 3. Map each seat to its status and price
  const seats = show.screen.seats.map((seat) => {
    let status = 'AVAILABLE';
    let isMine = false;
    let holdExpiresAt = null;

    if (bookedSeatIds.has(seat.id)) {
      status = 'BOOKED';
    } else if (activeHoldsBySeatId.has(seat.id)) {
      status = 'HELD';
      const hold = activeHoldsBySeatId.get(seat.id);
      holdExpiresAt = hold.expiresAt;
      if (currentUserId && hold.userId === currentUserId) {
        isMine = true;
      }
    }

    return {
      id: seat.id,
      rowLabel: seat.rowLabel,
      number: seat.number,
      category: seat.category.name,
      price: Number(seat.category.basePrice),
      status,
      isMine,
      holdExpiresAt,
    };
  });

  return {
    show: {
      id: show.id,
      startsAt: show.startsAt,
      endsAt: show.endsAt,
      status: show.status,
      movie: {
        id: show.movie.id,
        title: show.movie.title,
        durationMin: show.movie.durationMin,
        language: show.movie.language,
        format: show.movie.format,
        posterUrl: show.movie.posterUrl,
      },
      screen: {
        id: show.screen.id,
        name: show.screen.name,
        rows: show.screen.rows,
        cols: show.screen.cols,
        theatre: {
          id: show.screen.theatre.id,
          name: show.screen.theatre.name,
          city: show.screen.theatre.city,
        },
      },
    },
    seats,
  };
}
