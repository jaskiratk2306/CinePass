import {
  holdSeats,
  confirmBooking,
  cancelBooking,
  getMyBookings,
} from '../services/bookingService.js';

/**
 * Controller: Hold seats
 * POST /api/shows/:id/holds
 */
export async function createHold(req, res, next) {
  try {
    const showId = req.params.id;
    const { seatIds } = req.body;
    const userId = req.user.id;

    const result = await holdSeats({ showId, seatIds, userId });
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * Controller: Confirm booking
 * POST /api/bookings
 */
export async function createBooking(req, res, next) {
  try {
    const { showId, seatIds, holdIds, idempotencyKey, cardToken } = req.body;
    const userId = req.user.id;

    const result = await confirmBooking({
      showId,
      seatIds,
      holdIds,
      idempotencyKey,
      cardToken,
      userId,
    });

    const statusCode = result.isIdempotentReplay ? 200 : 201;
    return res.status(statusCode).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * Controller: Cancel booking
 * POST /api/bookings/:id/cancel
 */
export async function cancelUserBooking(req, res, next) {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await cancelBooking({ bookingId, userId, userRole });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * Controller: Get authenticated user's bookings history
 * GET /api/bookings/me
 */
export async function getUserBookingsHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const { page, pageSize } = req.query;

    const result = await getMyBookings({ userId, page, pageSize });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
