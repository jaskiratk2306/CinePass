import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createHold,
  createBooking,
  cancelUserBooking,
  getUserBookingsHistory,
} from '../controllers/bookingController.js';
import {
  holdSeatsSchema,
  confirmBookingSchema,
  cancelBookingParamSchema,
  myBookingsQuerySchema,
} from '../validators/bookingValidators.js';
import { showIdParamSchema } from '../validators/catalogValidators.js';

const router = Router();

// Hold seats for a show (requires authenticated user)
router.post(
  '/shows/:id/holds',
  requireAuth,
  validate({ params: showIdParamSchema, body: holdSeatsSchema }),
  createHold
);

// Confirm booking with idempotency and simulated payment
router.post(
  '/bookings',
  requireAuth,
  validate({ body: confirmBookingSchema }),
  createBooking
);

// Get current user's booking history
router.get(
  '/bookings/me',
  requireAuth,
  validate({ query: myBookingsQuerySchema }),
  getUserBookingsHistory
);

// Cancel booking (owner or admin, cutoff window enforced)
router.post(
  '/bookings/:id/cancel',
  requireAuth,
  validate({ params: cancelBookingParamSchema }),
  cancelUserBooking
);

export default router;
