import { z } from 'zod';

export const holdSeatsSchema = z.object({
  seatIds: z.array(z.string().min(1, 'Seat ID is required')).min(1, 'At least 1 seat must be selected').max(8, 'Maximum 8 seats can be held at once'),
});

export const confirmBookingSchema = z.object({
  showId: z.string().min(1, 'Show ID is required'),
  seatIds: z.array(z.string()).optional(),
  holdIds: z.array(z.string()).optional(),
  idempotencyKey: z.string().trim().min(1, 'Idempotency key is required'),
  cardToken: z.string().optional().default('tok_valid'),
}).refine((data) => (data.seatIds && data.seatIds.length > 0) || (data.holdIds && data.holdIds.length > 0), {
  message: 'Either seatIds or holdIds must be provided',
});

export const cancelBookingParamSchema = z.object({
  id: z.string().min(1, 'Booking ID is required'),
});

export const validateTicketSchema = z.object({
  qrToken: z.string().trim().min(1, 'QR Token is required'),
});

export const myBookingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(10),
});
