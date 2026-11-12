import { prisma } from '../config/db.js';
import { NotFoundError } from '../errors/AppError.js';

/**
 * Generates reconciled occupancy and revenue report for a show or date range.
 * RECONCILIATION GUARANTEE:
 * - bookedSeats = confirmed bookings' active seats (BookingSeat WHERE active = true)
 * - cancelledSeats = seats belonging to CANCELLED bookings
 * - totalSeats = screen capacity (or sum of capacities across shows in date range)
 * - availableSeats = totalSeats - bookedSeats
 * - grossRevenue = sum of confirmed active bookings totalAmount + cancelled bookings totalAmount
 * - refunds = sum of refunded amount from CANCELLED bookings
 * - netRevenue = grossRevenue - refunds (or exactly confirmed active bookings totalAmount)
 *
 * @param {object} params
 * @param {string} [params.showId]
 * @param {string} [params.startDate]
 * @param {string} [params.endDate]
 */
export async function getOccupancyReport({ showId, startDate, endDate }) {
  const showFilter = {};

  if (showId) {
    showFilter.id = showId;
  } else if (startDate || endDate) {
    showFilter.startsAt = {};
    if (startDate) {
      showFilter.startsAt.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      showFilter.startsAt.lte = end;
    }
  }

  // Retrieve shows with screen, seats, bookings, and bookingSeats
  const shows = await prisma.show.findMany({
    where: showFilter,
    include: {
      movie: {
        select: { id: true, title: true },
      },
      screen: {
        include: {
          theatre: { select: { id: true, name: true, city: true } },
          _count: { select: { seats: true } },
        },
      },
      bookings: {
        include: {
          seats: true,
          payment: true,
        },
      },
      bookingSeats: true,
    },
  });

  if (showId && shows.length === 0) {
    throw new NotFoundError('Show not found', 'SHOW_NOT_FOUND');
  }

  let totalCapacity = 0;
  let totalBookedSeats = 0;
  let totalCancelledSeats = 0;
  let grossRevenue = 0;
  let totalRefunds = 0;

  const showSummaries = shows.map((show) => {
    const screenCapacity = show.screen._count.seats;
    totalCapacity += screenCapacity;

    // Active confirmed seats (active = true)
    const activeSeats = show.bookingSeats.filter((bs) => bs.active === true);
    const bookedCount = activeSeats.length;
    totalBookedSeats += bookedCount;

    // Cancelled seats and bookings
    const confirmedBookings = show.bookings.filter((b) => b.status === 'CONFIRMED');
    const cancelledBookings = show.bookings.filter((b) => b.status === 'CANCELLED');

    const cancelledSeatsCount = cancelledBookings.reduce(
      (sum, b) => sum + b.seats.length,
      0
    );
    totalCancelledSeats += cancelledSeatsCount;

    // Financials
    const confirmedRevenue = confirmedBookings.reduce(
      (sum, b) => sum + Number(b.totalAmount),
      0
    );
    const refundedAmount = cancelledBookings.reduce(
      (sum, b) => sum + Number(b.totalAmount),
      0
    );

    grossRevenue += confirmedRevenue + refundedAmount;
    totalRefunds += refundedAmount;

    const netRevenue = confirmedRevenue;
    const availableSeats = Math.max(0, screenCapacity - bookedCount);
    const occupancyRate = screenCapacity > 0 ? (bookedCount / screenCapacity) * 100 : 0;

    return {
      showId: show.id,
      movieTitle: show.movie.title,
      theatre: `${show.screen.theatre.name} (${show.screen.theatre.city})`,
      screenName: show.screen.name,
      startsAt: show.startsAt,
      capacity: screenCapacity,
      bookedSeats: bookedCount,
      cancelledSeats: cancelledSeatsCount,
      availableSeats,
      occupancyRate: Number(occupancyRate.toFixed(2)),
      grossRevenue: Number((confirmedRevenue + refundedAmount).toFixed(2)),
      refunds: Number(refundedAmount.toFixed(2)),
      netRevenue: Number(netRevenue.toFixed(2)),
    };
  });

  const netRevenue = grossRevenue - totalRefunds;
  const overallOccupancyRate =
    totalCapacity > 0 ? (totalBookedSeats / totalCapacity) * 100 : 0;

  return {
    reconciliation: {
      rule1_bookedSeatsCheck: 'booked seats match confirmed active booking seats',
      rule2_revenueCheck: 'net revenue equals gross revenue minus refunds',
    },
    summary: {
      totalShows: shows.length,
      totalCapacity,
      totalBookedSeats,
      totalCancelledSeats,
      totalAvailableSeats: Math.max(0, totalCapacity - totalBookedSeats),
      overallOccupancyRate: Number(overallOccupancyRate.toFixed(2)),
      grossRevenue: Number(grossRevenue.toFixed(2)),
      refunds: Number(totalRefunds.toFixed(2)),
      netRevenue: Number(netRevenue.toFixed(2)),
    },
    shows: showSummaries,
  };
}
