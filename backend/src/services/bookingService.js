import { prisma } from '../config/db.js';
import { ENV } from '../config/env.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '../errors/AppError.js';
import {
  findActiveHoldsForSeats,
  findUserUnexpiredHolds,
  createHoldsForSeats,
} from '../repositories/holdRepository.js';
import {
  findActiveBookingSeats,
  createBookingTransaction,
  findBookingById,
  findBookingByIdempotency,
  findBookingByQrToken,
  cancelBookingTransaction,
  validateTicketTransaction,
  findUserBookingsHistory,
} from '../repositories/bookingRepository.js';
import { findShowById } from '../repositories/showRepository.js';
import { generateBookingReference, generateQrToken } from '../utils/generators.js';
import { logAuditEvent } from '../utils/auditLogger.js';

/**
 * Business Rule 1: Hold Seats
 * Holds seats for user for HOLD_TTL_MINUTES (default 5 min).
 * Max MAX_SEATS_PER_HOLD (default 8).
 * Checks seat existence, screen match, confirmed booking status, and active holds by others.
 */
export async function holdSeats({ showId, seatIds, userId }) {
  if (!seatIds || seatIds.length === 0) {
    throw new BadRequestError('At least one seat must be selected', 'EMPTY_SEAT_SELECTION');
  }

  if (seatIds.length > ENV.MAX_SEATS_PER_HOLD) {
    throw new BadRequestError(
      `Cannot hold more than ${ENV.MAX_SEATS_PER_HOLD} seats at a time`,
      'MAX_SEATS_EXCEEDED'
    );
  }

  // Deduplicate seatIds
  const uniqueSeatIds = [...new Set(seatIds)];

  return prisma.$transaction(async (tx) => {
    // 1. Verify show existence and status
    const show = await tx.show.findUnique({
      where: { id: showId },
      include: {
        screen: {
          include: {
            seats: {
              where: { id: { in: uniqueSeatIds } },
              include: { category: true },
            },
          },
        },
      },
    });

    if (!show || show.status !== 'SCHEDULED') {
      throw new NotFoundError('Show is not scheduled or does not exist', 'SHOW_NOT_AVAILABLE');
    }

    // 2. Verify all selected seats belong to this show's screen
    const foundSeats = show.screen.seats;
    if (foundSeats.length !== uniqueSeatIds.length) {
      throw new BadRequestError(
        'One or more selected seats do not belong to this screen',
        'INVALID_SEAT_SELECTION'
      );
    }

    // 3. Verify no active confirmed booking exists for these seats
    const existingBooked = await tx.bookingSeat.findMany({
      where: {
        showId,
        seatId: { in: uniqueSeatIds },
        active: true,
      },
    });

    if (existingBooked.length > 0) {
      throw new ConflictError(
        'One or more selected seats are already booked',
        'SEAT_UNAVAILABLE'
      );
    }

    // 4. Verify no active unexpired hold by another user
    const now = new Date();
    const otherUserHolds = await tx.seatHold.findMany({
      where: {
        showId,
        seatId: { in: uniqueSeatIds },
        status: 'ACTIVE',
        expiresAt: { gt: now },
        userId: { not: userId },
      },
    });

    if (otherUserHolds.length > 0) {
      throw new ConflictError(
        'One or more selected seats are currently held by another user',
        'SEAT_HELD'
      );
    }

    // 5. Release any expired or previous holds by this user on these seats
    await tx.seatHold.updateMany({
      where: {
        showId,
        userId,
        seatId: { in: uniqueSeatIds },
        status: 'ACTIVE',
      },
      data: {
        status: 'RELEASED',
      },
    });

    // 6. Create new holds
    const expiresAt = new Date(Date.now() + ENV.HOLD_TTL_MINUTES * 60 * 1000);
    const createdHolds = await createHoldsForSeats(showId, uniqueSeatIds, userId, expiresAt, tx);

    // 7. Write AuditLog inside transaction
    await logAuditEvent(
      {
        actorId: userId,
        action: 'HOLD_SEATS',
        entityType: 'SEAT_HOLD',
        entityId: showId,
        metadata: {
          showId,
          seatIds: uniqueSeatIds,
          expiresAt: expiresAt.toISOString(),
          seatsCount: uniqueSeatIds.length,
        },
      },
      tx
    );

    return {
      message: 'Seats held successfully',
      showId,
      expiresAt: expiresAt.toISOString(),
      ttlMinutes: ENV.HOLD_TTL_MINUTES,
      holds: createdHolds.map((h) => ({
        id: h.id,
        seatId: h.seatId,
        rowLabel: h.seat.rowLabel,
        number: h.seat.number,
        category: h.seat.category.name,
        price: Number(h.seat.category.basePrice),
      })),
    };
  });
}

/**
 * Business Rule 3 & 4: Confirm Booking with Concurrency Protection & Idempotency
 * Requires user's own unexpired holds.
 * Simulated payment fails if cardToken starts with 'fail'.
 * Double booking prevented at DB level by partial unique index and transaction.
 */
export async function confirmBooking({
  showId,
  seatIds = null,
  holdIds = null,
  idempotencyKey,
  cardToken = 'tok_valid',
  userId,
}) {
  // 1. Check idempotency outside transaction first for performance
  const existingBooking = await findBookingByIdempotency(userId, idempotencyKey);
  if (existingBooking) {
    return {
      message: 'Booking retrieved via idempotency key',
      isIdempotentReplay: true,
      booking: existingBooking,
    };
  }

  // 2. Simulated payment check: fails if cardToken is 'fail'
  if (cardToken && cardToken.toLowerCase().startsWith('fail')) {
    throw new BadRequestError(
      'Payment transaction failed: simulated card was declined',
      'PAYMENT_FAILED'
    );
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // Re-verify idempotency inside transaction
      const replayBooking = await tx.booking.findUnique({
        where: {
          userId_idempotencyKey: {
            userId,
            idempotencyKey,
          },
        },
        include: {
          show: { include: { movie: true, screen: { include: { theatre: true } } } },
          seats: { include: { seat: { include: { category: true } } } },
          payment: true,
        },
      });

      if (replayBooking) {
        return {
          message: 'Booking retrieved via idempotency key',
          isIdempotentReplay: true,
          booking: replayBooking,
        };
      }

      // 3. Verify user's own active, unexpired holds
      const userHolds = await findUserUnexpiredHolds(
        { showId, userId, seatIds, holdIds },
        tx
      );

      if (userHolds.length === 0) {
        throw new ConflictError(
          'No valid active holds found for this booking. Holds may have expired or not belong to you.',
          'HOLD_EXPIRED_OR_INVALID'
        );
      }

      if (seatIds && userHolds.length !== seatIds.length) {
        throw new ConflictError(
          'One or more seat holds have expired or are missing',
          'HOLD_EXPIRED_OR_INVALID'
        );
      }

      const seatsToBook = userHolds.map((h) => ({
        seatId: h.seatId,
        price: h.seat.category.basePrice,
      }));

      const targetSeatIds = seatsToBook.map((s) => s.seatId);

      // 4. Verify no active confirmed booking exists for these seats
      const activeBookedSeats = await tx.bookingSeat.findMany({
        where: {
          showId,
          seatId: { in: targetSeatIds },
          active: true,
        },
      });

      if (activeBookedSeats.length > 0) {
        throw new ConflictError(
          'One or more seats have already been booked by another user',
          'SEAT_UNAVAILABLE'
        );
      }

      // 5. Calculate total amount
      const totalAmount = seatsToBook.reduce(
        (sum, item) => sum + Number(item.price),
        0
      );

      // 6. Generate booking reference and QR token
      const reference = generateBookingReference();
      const qrToken = generateQrToken();
      const providerRef = `SIM-PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 7. Persist booking and active seats in DB
      // CRITICAL: The partial unique index on BookingSeat (showId, seatId) WHERE active = true
      // enforces single-winner concurrency at the database level!
      const { booking, payment } = await createBookingTransaction({
        tx,
        userId,
        showId,
        reference,
        qrToken,
        idempotencyKey,
        totalAmount,
        seatsToBook,
        holdIds: userHolds.map((h) => h.id),
        providerRef,
      });

      // 8. Write AuditLog inside transaction
      await logAuditEvent(
        {
          actorId: userId,
          action: 'BOOKING_CONFIRMED',
          entityType: 'BOOKING',
          entityId: booking.id,
          metadata: {
            reference,
            showId,
            seatsCount: targetSeatIds.length,
            totalAmount,
            providerRef,
          },
        },
        tx
      );

      // Load full booking details to return
      const fullBooking = await tx.booking.findUnique({
        where: { id: booking.id },
        include: {
          show: {
            include: {
              movie: true,
              screen: {
                include: { theatre: true },
              },
            },
          },
          seats: {
            include: {
              seat: {
                include: { category: true },
              },
            },
          },
          payment: true,
        },
      });

      return {
        message: 'Booking confirmed successfully',
        booking: fullBooking,
      };
    });
  } catch (err) {
    // Map Postgres unique constraint violations on BookingSeat to 409 SEAT_UNAVAILABLE
    if (err.code === 'P2002') {
      throw new ConflictError(
        'One or more selected seats were concurrently booked by another user',
        'SEAT_UNAVAILABLE'
      );
    }
    throw err;
  }
}

/**
 * Business Rule 5: Cancel Booking
 * Allowed only for owner or admin.
 * Requires booking to be CONFIRMED, not checked-in, and show starts > CANCEL_CUTOFF_HOURS away.
 * Frees seats immediately (BookingSeat.active = false) and marks refundStatus = REFUNDED.
 */
export async function cancelBooking({ bookingId, userId, userRole }) {
  const booking = await findBookingById(bookingId);
  if (!booking) {
    throw new NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
  }

  // 1. Authorization: only owner or admin
  if (booking.userId !== userId && userRole !== 'ADMIN') {
    throw new ForbiddenError(
      'You do not have permission to cancel this booking',
      'FORBIDDEN'
    );
  }

  // 2. Validate current state
  if (booking.status !== 'CONFIRMED') {
    throw new ConflictError(
      `Cannot cancel booking with status "${booking.status}"`,
      'INVALID_STATE'
    );
  }

  if (booking.checkedInAt) {
    throw new ConflictError(
      'Cannot cancel a booking that has already been checked in',
      'INVALID_STATE'
    );
  }

  // 3. Validate cancellation cutoff window
  const now = new Date();
  const showStartTime = new Date(booking.show.startsAt).getTime();
  const cutoffMs = ENV.CANCEL_CUTOFF_HOURS * 60 * 60 * 1000;
  const timeUntilShow = showStartTime - now.getTime();

  if (timeUntilShow <= cutoffMs) {
    throw new ConflictError(
      `Bookings can only be cancelled at least ${ENV.CANCEL_CUTOFF_HOURS} hours before the show starts`,
      'CANCEL_CUTOFF_EXCEEDED'
    );
  }

  // 4. Perform cancellation in transaction
  return prisma.$transaction(async (tx) => {
    const cancelled = await cancelBookingTransaction(tx, bookingId);

    // AuditLog
    await logAuditEvent(
      {
        actorId: userId,
        action: 'BOOKING_CANCELLED',
        entityType: 'BOOKING',
        entityId: bookingId,
        metadata: {
          reference: booking.reference,
          seatsFreed: booking.seats.length,
          refundAmount: booking.totalAmount,
        },
      },
      tx
    );

    return {
      message: 'Booking cancelled successfully. Seats have been released and refund processed.',
      booking: cancelled,
    };
  });
}

/**
 * Business Rule 6: Ticket Validation
 * ADMIN only.
 * Validates QR token: succeeds once (sets checkedInAt).
 * Second scan returns 409 ALREADY_USED.
 * Cancelled tickets rejected.
 */
export async function validateTicket({ qrToken, adminId }) {
  const booking = await findBookingByQrToken(qrToken);
  if (!booking) {
    throw new NotFoundError(
      'Invalid QR token: no matching booking found',
      'TICKET_NOT_FOUND'
    );
  }

  if (booking.status === 'CANCELLED') {
    throw new ConflictError(
      'This booking has been cancelled and cannot be used',
      'TICKET_CANCELLED'
    );
  }

  if (booking.status !== 'CONFIRMED') {
    throw new ConflictError(
      `Ticket cannot be validated in "${booking.status}" state`,
      'INVALID_STATE'
    );
  }

  if (booking.checkedInAt) {
    throw new ConflictError(
      `Ticket has already been checked in at ${booking.checkedInAt.toISOString()}`,
      'ALREADY_USED',
      { checkedInAt: booking.checkedInAt }
    );
  }

  return prisma.$transaction(async (tx) => {
    const validated = await validateTicketTransaction(tx, booking.id);

    await logAuditEvent(
      {
        actorId: adminId,
        action: 'TICKET_VALIDATED',
        entityType: 'BOOKING',
        entityId: booking.id,
        metadata: {
          reference: booking.reference,
          checkedInAt: validated.checkedInAt.toISOString(),
        },
      },
      tx
    );

    return {
      valid: true,
      message: 'Ticket validated successfully. Welcome to the show!',
      booking: {
        id: booking.id,
        reference: booking.reference,
        checkedInAt: validated.checkedInAt,
        show: {
          movie: booking.show.movie.title,
          theatre: booking.show.screen.theatre.name,
          screen: booking.show.screen.name,
          startsAt: booking.show.startsAt,
        },
        seats: booking.seats.map((s) => `${s.seat.rowLabel}${s.seat.number}`),
        customerName: booking.user.name,
      },
    };
  });
}

/**
 * User booking history
 */
export async function getMyBookings({ userId, page = 1, pageSize = 10 }) {
  return findUserBookingsHistory(userId, page, pageSize);
}
