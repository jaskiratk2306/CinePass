import { prisma } from '../config/db.js';

export async function findBookingById(id, tx = null) {
  const client = tx || prisma;
  return client.booking.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
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
}

export async function findBookingByReference(reference, tx = null) {
  const client = tx || prisma;
  return client.booking.findUnique({
    where: { reference },
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
    },
  });
}

export async function findBookingByQrToken(qrToken, tx = null) {
  const client = tx || prisma;
  return client.booking.findUnique({
    where: { qrToken },
    include: {
      user: { select: { id: true, name: true, email: true } },
      show: {
        include: {
          movie: true,
          screen: { include: { theatre: true } },
        },
      },
      seats: {
        include: {
          seat: { include: { category: true } },
        },
      },
    },
  });
}

export async function findBookingByIdempotency(userId, idempotencyKey, tx = null) {
  const client = tx || prisma;
  return client.booking.findUnique({
    where: {
      userId_idempotencyKey: {
        userId,
        idempotencyKey,
      },
    },
    include: {
      show: {
        include: {
          movie: true,
          screen: { include: { theatre: true } },
        },
      },
      seats: {
        include: {
          seat: { include: { category: true } },
        },
      },
      payment: true,
    },
  });
}

/**
 * Finds all active confirmed seats for a show.
 */
export async function findActiveBookingSeats(showId, seatIds, tx = null) {
  const client = tx || prisma;
  return client.bookingSeat.findMany({
    where: {
      showId,
      seatId: { in: seatIds },
      active: true,
    },
  });
}

/**
 * Persists booking, booking seats, payment, and converts holds in a transaction.
 */
export async function createBookingTransaction({
  tx,
  userId,
  showId,
  reference,
  qrToken,
  idempotencyKey,
  totalAmount,
  seatsToBook,
  holdIds,
  providerRef,
}) {
  // 1. Create confirmed booking
  const booking = await tx.booking.create({
    data: {
      userId,
      showId,
      reference,
      qrToken,
      idempotencyKey,
      totalAmount,
      status: 'CONFIRMED',
      refundStatus: 'NONE',
    },
  });

  // 2. Create BookingSeat records with active: true
  // CRITICAL: The Postgres partial unique index on (showId, seatId) WHERE active = true
  // will throw unique violation here if another concurrent tx committed first!
  const bookingSeatsData = seatsToBook.map((item) => ({
    bookingId: booking.id,
    showId,
    seatId: item.seatId,
    priceAtBooking: item.price,
    active: true,
  }));

  await tx.bookingSeat.createMany({
    data: bookingSeatsData,
  });

  // 3. Mark user's holds as CONVERTED
  if (holdIds && holdIds.length > 0) {
    await tx.seatHold.updateMany({
      where: { id: { in: holdIds } },
      data: { status: 'CONVERTED' },
    });
  }

  // 4. Create Payment record
  const payment = await tx.payment.create({
    data: {
      bookingId: booking.id,
      status: 'SUCCESS',
      providerRef,
      amount: totalAmount,
    },
  });

  return { booking, payment };
}

/**
 * Cancels booking, frees booking seats (active = false), and records simulated refund.
 */
export async function cancelBookingTransaction(tx, bookingId) {
  // 1. Update Booking
  const updatedBooking = await tx.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CANCELLED',
      refundStatus: 'REFUNDED',
    },
  });

  // 2. Free the seats immediately by setting active = false
  await tx.bookingSeat.updateMany({
    where: { bookingId },
    data: { active: false },
  });

  // 3. Update payment status if exists
  await tx.payment.updateMany({
    where: { bookingId },
    data: { status: 'REFUNDED' },
  });

  return updatedBooking;
}

/**
 * Sets checkedInAt on booking upon ticket validation.
 */
export async function validateTicketTransaction(tx, bookingId) {
  return tx.booking.update({
    where: { id: bookingId },
    data: {
      checkedInAt: new Date(),
    },
  });
}

/**
 * Fetches user's booking history paginated.
 */
export async function findUserBookingsHistory(userId, page = 1, pageSize = 10) {
  const skip = (page - 1) * pageSize;
  const where = { userId };

  const [total, bookings] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
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
    }),
  ]);

  return {
    data: bookings,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
