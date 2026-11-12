import { Router } from 'express';
import {
  getMovies,
  getMovie,
  getShows,
  getSeatMap,
} from '../controllers/catalogController.js';
import { validate } from '../middlewares/validate.js';
import { optionalAuth } from '../middlewares/auth.js';
import {
  listMoviesQuerySchema,
  movieIdParamSchema,
  listShowsQuerySchema,
  showIdParamSchema,
} from '../validators/catalogValidators.js';

const router = Router();

// Public Movies
router.get(
  '/movies',
  validate({ query: listMoviesQuerySchema }),
  getMovies
);

router.get(
  '/movies/:id',
  validate({ params: movieIdParamSchema }),
  getMovie
);

// Public Shows
router.get(
  '/shows',
  validate({ query: listShowsQuerySchema }),
  getShows
);

// Real-time Seat Map for Show (optionalAuth allows highlighting current user's holds)
router.get(
  '/shows/:id/seats',
  optionalAuth,
  validate({ params: showIdParamSchema }),
  getSeatMap
);

export default router;
