import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createMovie,
  updateMovie,
  deleteMovie,
  getGenres,
  createGenre,
  deleteGenre,
  getTheatres,
  createTheatre,
  updateTheatre,
  deleteTheatre,
  createScreen,
  getScreen,
  getSeatCategories,
  createSeatCategory,
  updateSeatCategory,
  createShow,
  updateShow,
  deleteShow,
} from '../controllers/adminCatalogController.js';
import { validateTicketController } from '../controllers/adminTicketController.js';
import {
  getOccupancyReportController,
  getAuditLogsController,
} from '../controllers/reportController.js';
import {
  createMovieSchema,
  updateMovieSchema,
  createGenreSchema,
  createTheatreSchema,
  updateTheatreSchema,
  createScreenSchema,
  createSeatCategorySchema,
  updateSeatCategorySchema,
  createShowSchema,
  updateShowSchema,
} from '../validators/adminValidators.js';
import { validateTicketSchema } from '../validators/bookingValidators.js';
import {
  occupancyReportQuerySchema,
  auditLogsQuerySchema,
} from '../validators/reportValidators.js';

const router = Router();

// Server-side ADMIN role middleware on ALL routes under /api/admin
router.use(requireAuth, requireRole('ADMIN'));

// --- Ticket Validation ---
router.post('/tickets/validate', validate({ body: validateTicketSchema }), validateTicketController);

// --- Reports & Audit Logs ---
router.get('/reports/occupancy', validate({ query: occupancyReportQuerySchema }), getOccupancyReportController);
router.get('/audit-logs', validate({ query: auditLogsQuerySchema }), getAuditLogsController);

// --- Movies ---
router.post('/movies', validate({ body: createMovieSchema }), createMovie);
router.put('/movies/:id', validate({ body: updateMovieSchema }), updateMovie);
router.delete('/movies/:id', deleteMovie);

// --- Genres ---
router.get('/genres', getGenres);
router.post('/genres', validate({ body: createGenreSchema }), createGenre);
router.delete('/genres/:id', deleteGenre);

// --- Theatres ---
router.get('/theatres', getTheatres);
router.post('/theatres', validate({ body: createTheatreSchema }), createTheatre);
router.put('/theatres/:id', validate({ body: updateTheatreSchema }), updateTheatre);
router.delete('/theatres/:id', deleteTheatre);

// --- Screens & Seat Generation ---
router.post('/screens', validate({ body: createScreenSchema }), createScreen);
router.get('/screens/:id', getScreen);

// --- Seat Categories ---
router.get('/seat-categories', getSeatCategories);
router.post('/seat-categories', validate({ body: createSeatCategorySchema }), createSeatCategory);
router.put('/seat-categories/:id', validate({ body: updateSeatCategorySchema }), updateSeatCategory);

// --- Shows ---
router.post('/shows', validate({ body: createShowSchema }), createShow);
router.put('/shows/:id', validate({ body: updateShowSchema }), updateShow);
router.delete('/shows/:id', deleteShow);

export default router;
