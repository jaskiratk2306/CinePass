import {
  listMovies,
  getMovieDetails,
  listShows,
  getShowSeatMap,
} from '../services/catalogService.js';
import { listAllGenres } from '../services/adminCatalogService.js';

export async function getMovies(req, res, next) {
  try {
    const result = await listMovies(req.query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getMovie(req, res, next) {
  try {
    const movie = await getMovieDetails(req.params.id);
    return res.status(200).json({ data: movie });
  } catch (err) {
    return next(err);
  }
}

export async function getShows(req, res, next) {
  try {
    const result = await listShows(req.query);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function getSeatMap(req, res, next) {
  try {
    const currentUserId = req.user?.id || null;
    const seatMap = await getShowSeatMap(req.params.id, currentUserId);
    return res.status(200).json({ data: seatMap });
  } catch (err) {
    return next(err);
  }
}


export async function getPublicGenres(req, res, next) {
  try {
    const genres = await listAllGenres();
    return res.status(200).json({ data: genres });
  } catch (err) {
    return next(err);
  }
}
