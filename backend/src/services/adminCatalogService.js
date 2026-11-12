import {
  createMovie,
  updateMovie,
  deleteMovie,
  findMovieById,
} from '../repositories/movieRepository.js';
import {
  findGenres,
  createGenre,
  deleteGenre,
} from '../repositories/genreRepository.js';
import {
  findTheatres,
  findTheatreById,
  createTheatre,
  updateTheatre,
  deleteTheatre,
} from '../repositories/theatreRepository.js';
import {
  createScreenWithSeats,
  findScreenById,
  deleteScreen,
} from '../repositories/screenRepository.js';
import {
  findSeatCategories,
  createSeatCategory,
  updateSeatCategory,
} from '../repositories/seatCategoryRepository.js';
import {
  createShow,
  updateShow,
  deleteShow,
  checkShowOverlap,
  findShowById,
} from '../repositories/showRepository.js';
import { ConflictError, NotFoundError, BadRequestError } from '../errors/AppError.js';
import { logAuditEvent } from '../utils/auditLogger.js';

// --- Movies ---
export async function addMovie(data, actorId) {
  const { genreIds, ...movieData } = data;
  const movie = await createMovie(movieData, genreIds);

  await logAuditEvent({
    actorId,
    action: 'CREATE_MOVIE',
    entityType: 'MOVIE',
    entityId: movie.id,
    metadata: { title: movie.title },
  });

  return movie;
}

export async function editMovie(id, data, actorId) {
  const existing = await findMovieById(id);
  if (!existing) {
    throw new NotFoundError('Movie not found', 'MOVIE_NOT_FOUND');
  }

  const { genreIds, ...movieData } = data;
  const updated = await updateMovie(id, movieData, genreIds);

  await logAuditEvent({
    actorId,
    action: 'UPDATE_MOVIE',
    entityType: 'MOVIE',
    entityId: id,
    metadata: { title: updated.title },
  });

  return updated;
}

export async function removeMovie(id, actorId) {
  const existing = await findMovieById(id);
  if (!existing) {
    throw new NotFoundError('Movie not found', 'MOVIE_NOT_FOUND');
  }

  await deleteMovie(id);

  await logAuditEvent({
    actorId,
    action: 'DELETE_MOVIE',
    entityType: 'MOVIE',
    entityId: id,
    metadata: { title: existing.title },
  });

  return { message: 'Movie deleted successfully' };
}

// --- Genres ---
export async function listAllGenres() {
  return findGenres();
}

export async function addGenre(name, actorId) {
  const genre = await createGenre(name);
  await logAuditEvent({
    actorId,
    action: 'CREATE_GENRE',
    entityType: 'GENRE',
    entityId: genre.id,
    metadata: { name: genre.name },
  });
  return genre;
}

export async function removeGenre(id, actorId) {
  await deleteGenre(id);
  await logAuditEvent({
    actorId,
    action: 'DELETE_GENRE',
    entityType: 'GENRE',
    entityId: id,
  });
  return { message: 'Genre deleted successfully' };
}

// --- Theatres ---
export async function listAllTheatres() {
  return findTheatres();
}

export async function addTheatre({ name, city }, actorId) {
  const theatre = await createTheatre({ name, city });
  await logAuditEvent({
    actorId,
    action: 'CREATE_THEATRE',
    entityType: 'THEATRE',
    entityId: theatre.id,
    metadata: { name, city },
  });
  return theatre;
}

export async function editTheatre(id, data, actorId) {
  const existing = await findTheatreById(id);
  if (!existing) {
    throw new NotFoundError('Theatre not found', 'THEATRE_NOT_FOUND');
  }
  const updated = await updateTheatre(id, data);
  await logAuditEvent({
    actorId,
    action: 'UPDATE_THEATRE',
    entityType: 'THEATRE',
    entityId: id,
    metadata: data,
  });
  return updated;
}

export async function removeTheatre(id, actorId) {
  const existing = await findTheatreById(id);
  if (!existing) {
    throw new NotFoundError('Theatre not found', 'THEATRE_NOT_FOUND');
  }
  await deleteTheatre(id);
  await logAuditEvent({
    actorId,
    action: 'DELETE_THEATRE',
    entityType: 'THEATRE',
    entityId: id,
  });
  return { message: 'Theatre deleted successfully' };
}

// --- Screens & Seat Generation ---
export async function addScreenWithSeats(params, actorId) {
  const theatre = await findTheatreById(params.theatreId);
  if (!theatre) {
    throw new NotFoundError('Theatre not found', 'THEATRE_NOT_FOUND');
  }

  const screen = await createScreenWithSeats(params);

  await logAuditEvent({
    actorId,
    action: 'CREATE_SCREEN_WITH_SEATS',
    entityType: 'SCREEN',
    entityId: screen.id,
    metadata: {
      theatreId: params.theatreId,
      name: params.name,
      rows: params.rows,
      cols: params.cols,
      totalSeats: screen.seats.length,
    },
  });

  return screen;
}

export async function getScreenDetails(id) {
  const screen = await findScreenById(id);
  if (!screen) {
    throw new NotFoundError('Screen not found', 'SCREEN_NOT_FOUND');
  }
  return screen;
}

// --- Seat Categories ---
export async function listSeatCategories() {
  return findSeatCategories();
}

export async function addSeatCategory(data, actorId) {
  const category = await createSeatCategory(data);
  await logAuditEvent({
    actorId,
    action: 'CREATE_SEAT_CATEGORY',
    entityType: 'SEAT_CATEGORY',
    entityId: category.id,
    metadata: data,
  });
  return category;
}

export async function editSeatCategory(id, data, actorId) {
  const category = await updateSeatCategory(id, data);
  await logAuditEvent({
    actorId,
    action: 'UPDATE_SEAT_CATEGORY',
    entityType: 'SEAT_CATEGORY',
    entityId: id,
    metadata: data,
  });
  return category;
}

// --- Shows with Overlap Prevention ---
export async function addShow(data, actorId) {
  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);

  if (startsAt >= endsAt) {
    throw new BadRequestError('Show start time must be before end time', 'INVALID_SHOW_TIMES');
  }

  // Prevent overlapping shows on the same screen
  const overlap = await checkShowOverlap(data.screenId, startsAt, endsAt);
  if (overlap) {
    throw new ConflictError(
      `Show overlaps with an existing scheduled show: "${overlap.movie.title}" (${overlap.startsAt.toISOString()} - ${overlap.endsAt.toISOString()})`,
      'SHOW_TIME_OVERLAP'
    );
  }

  const show = await createShow(data);

  await logAuditEvent({
    actorId,
    action: 'CREATE_SHOW',
    entityType: 'SHOW',
    entityId: show.id,
    metadata: {
      movieId: data.movieId,
      screenId: data.screenId,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
    },
  });

  return show;
}

export async function editShow(id, data, actorId) {
  const existing = await findShowById(id);
  if (!existing) {
    throw new NotFoundError('Show not found', 'SHOW_NOT_FOUND');
  }

  const startsAt = data.startsAt ? new Date(data.startsAt) : existing.startsAt;
  const endsAt = data.endsAt ? new Date(data.endsAt) : existing.endsAt;
  const screenId = data.screenId || existing.screenId;

  if (startsAt >= endsAt) {
    throw new BadRequestError('Show start time must be before end time', 'INVALID_SHOW_TIMES');
  }

  // Check overlap excluding this show
  const overlap = await checkShowOverlap(screenId, startsAt, endsAt, id);
  if (overlap) {
    throw new ConflictError(
      `Show update creates an overlap with show "${overlap.movie.title}" (${overlap.startsAt.toISOString()} - ${overlap.endsAt.toISOString()})`,
      'SHOW_TIME_OVERLAP'
    );
  }

  const updated = await updateShow(id, data);

  await logAuditEvent({
    actorId,
    action: 'UPDATE_SHOW',
    entityType: 'SHOW',
    entityId: id,
    metadata: data,
  });

  return updated;
}

export async function removeShow(id, actorId) {
  const existing = await findShowById(id);
  if (!existing) {
    throw new NotFoundError('Show not found', 'SHOW_NOT_FOUND');
  }

  await deleteShow(id);

  await logAuditEvent({
    actorId,
    action: 'DELETE_SHOW',
    entityType: 'SHOW',
    entityId: id,
  });

  return { message: 'Show deleted successfully' };
}
