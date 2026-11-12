import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/db.js';

describe('Phase 4 - Booking Flow, Holds, Idempotency, Cancellation & Ticket Validation', () => {
  let user1Token;
  let user2Token;
  let adminToken;
  let testShow;
  let availableSeats;

  beforeAll(async () => {
    // 1. Authenticate user 1
    const u1Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@demo.test', password: 'User@123' });
    user1Token = u1Res.body.token;

    // 2. Authenticate user 2
    const u2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user2@demo.test', password: 'User@123' });
    user2Token = u2Res.body.token;

    // 3. Authenticate admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.test', password: 'Admin@123' });
    adminToken = adminRes.body.token;

    // 4. Find a scheduled test show far enough in the future for cancellations (> 2 hours)
    const farFutureDate = new Date();
    farFutureDate.setDate(farFutureDate.getDate() + 5);

    const movie = await prisma.movie.findFirst();
    const screen = await prisma.screen.findFirst({
      include: {
        seats: {
          include: { category: true },
          take: 10,
        },
      },
    });

    testShow = await prisma.show.create({
      data: {
        movieId: movie.id,
        screenId: screen.id,
        startsAt: farFutureDate,
        endsAt: new Date(farFutureDate.getTime() + 2 * 3600 * 1000),
        status: 'SCHEDULED',
      },
    });

    availableSeats = screen.seats;
  });

  afterAll(async () => {
    // Cleanup created test show and its bookings/holds
    if (testShow) {
      await prisma.auditLog.deleteMany({
        where: { entityId: testShow.id },
      });
      await prisma.bookingSeat.deleteMany({
        where: { showId: testShow.id },
      });
      await prisma.booking.deleteMany({
        where: { showId: testShow.id },
      });
      await prisma.seatHold.deleteMany({
        where: { showId: testShow.id },
      });
      await prisma.show.delete({
        where: { id: testShow.id },
      });
    }
    await prisma.$disconnect();
  });

  describe('1. Seat Hold and Booking Flow', () => {
    let holdResponse;
    let confirmedBooking;
    const seatToHold = () => availableSeats[0].id;

    it('should hold an available seat successfully', async () => {
      const res = await request(app)
        .post(`/api/shows/${testShow.id}/holds`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ seatIds: [seatToHold()] });

      expect(res.status).toBe(201);
      expect(res.body.holds).toHaveLength(1);
      expect(res.body.holds[0].seatId).toBe(seatToHold());
      expect(res.body.expiresAt).toBeDefined();
      holdResponse = res.body;
    });

    it('should prevent another user from holding the same seat while held', async () => {
      const res = await request(app)
        .post(`/api/shows/${testShow.id}/holds`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ seatIds: [seatToHold()] });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SEAT_HELD');
    });

    it('should fail booking if simulated card token indicates failure', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          showId: testShow.id,
          seatIds: [seatToHold()],
          idempotencyKey: 'test-fail-payment-key-1',
          cardToken: 'fail_card_declined',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PAYMENT_FAILED');
    });

    it('should confirm booking using active holds and simulated payment', async () => {
      const idempotencyKey = `idemp-${Date.now()}-user1`;
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          showId: testShow.id,
          seatIds: [seatToHold()],
          idempotencyKey,
          cardToken: 'tok_visa_success',
        });

      expect(res.status).toBe(201);
      expect(res.body.booking).toBeDefined();
      expect(res.body.booking.status).toBe('CONFIRMED');
      expect(res.body.booking.reference).toMatch(/^CIN-[A-Z0-9]{6}$/);
      expect(res.body.booking.qrToken).toHaveLength(64);
      expect(res.body.booking.seats).toHaveLength(1);
      expect(res.body.booking.seats[0].active).toBe(true);

      confirmedBooking = res.body.booking;
    });

    it('should return the identical booking on duplicate idempotencyKey without creating duplicates', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          showId: testShow.id,
          seatIds: [seatToHold()],
          idempotencyKey: confirmedBooking.idempotencyKey,
        });

      expect(res.status).toBe(200);
      expect(res.body.isIdempotentReplay).toBe(true);
      expect(res.body.booking.id).toBe(confirmedBooking.id);
      expect(res.body.booking.reference).toBe(confirmedBooking.reference);
    });

    it('should prevent holding a seat that is already booked', async () => {
      const res = await request(app)
        .post(`/api/shows/${testShow.id}/holds`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ seatIds: [seatToHold()] });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SEAT_UNAVAILABLE');
    });
  });

  describe('2. Lazy Expiry of Holds', () => {
    const seatForExpiry = () => availableSeats[1].id;

    it('should allow another user to hold a seat once its previous hold has expired', async () => {
      // 1. User 1 holds seat
      const holdRes = await request(app)
        .post(`/api/shows/${testShow.id}/holds`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ seatIds: [seatForExpiry()] });

      expect(holdRes.status).toBe(201);
      const holdId = holdRes.body.holds[0].id;

      // 2. Manipulate hold expiresAt in database to 10 minutes in the past
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      await prisma.seatHold.update({
        where: { id: holdId },
        data: { expiresAt: tenMinutesAgo },
      });

      // 3. User 2 should now be able to hold the seat lazily without waiting for cleanup cron
      const holdRes2 = await request(app)
        .post(`/api/shows/${testShow.id}/holds`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ seatIds: [seatForExpiry()] });

      expect(holdRes2.status).toBe(201);
      expect(holdRes2.body.holds[0].seatId).toBe(seatForExpiry());
    });
  });

  describe('3. Ticket Validation (Admin Only)', () => {
    let bookingToValidate;
    const seatForValidation = () => availableSeats[2].id;

    beforeAll(async () => {
      // Hold and book seat for validation test
      await request(app)
        .post(`/api/shows/${testShow.id}/holds`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ seatIds: [seatForValidation()] });

      const bookRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          showId: testShow.id,
          seatIds: [seatForValidation()],
          idempotencyKey: `idemp-val-${Date.now()}`,
        });
      bookingToValidate = bookRes.body.booking;
    });

    it('should allow admin to validate a ticket once and mark checkedInAt', async () => {
      const res = await request(app)
        .post('/api/admin/tickets/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ qrToken: bookingToValidate.qrToken });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.booking.checkedInAt).toBeDefined();
    });

    it('should reject a second validation attempt with 409 ALREADY_USED', async () => {
      const res = await request(app)
        .post('/api/admin/tickets/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ qrToken: bookingToValidate.qrToken });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_USED');
    });

    it('should reject validation with non-existent token with 404 TICKET_NOT_FOUND', async () => {
      const res = await request(app)
        .post('/api/admin/tickets/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ qrToken: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TICKET_NOT_FOUND');
    });
  });

  describe('4. Cancellation Flow & Cutoff Window', () => {
    let cancellableBooking;
    const seatForCancel = () => availableSeats[3].id;

    beforeAll(async () => {
      await request(app)
        .post(`/api/shows/${testShow.id}/holds`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ seatIds: [seatForCancel()] });

      const bookRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          showId: testShow.id,
          seatIds: [seatForCancel()],
          idempotencyKey: `idemp-cancel-${Date.now()}`,
        });
      cancellableBooking = bookRes.body.booking;
    });

    it('should reject cancellation by non-owner user with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post(`/api/bookings/${cancellableBooking.id}/cancel`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should cancel booking successfully when outside cutoff window and release seats', async () => {
      const res = await request(app)
        .post(`/api/bookings/${cancellableBooking.id}/cancel`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.booking.status).toBe('CANCELLED');
      expect(res.body.booking.refundStatus).toBe('REFUNDED');

      // Verify in DB that BookingSeat.active is now false
      const bookingSeats = await prisma.bookingSeat.findMany({
        where: { bookingId: cancellableBooking.id },
      });
      for (const bs of bookingSeats) {
        expect(bs.active).toBe(false);
      }
    });

    it('should reject cancelling an already cancelled booking with 409 INVALID_STATE', async () => {
      const res = await request(app)
        .post(`/api/bookings/${cancellableBooking.id}/cancel`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATE');
    });

    it('should reject ticket validation on a cancelled booking with 409 TICKET_CANCELLED', async () => {
      const res = await request(app)
        .post('/api/admin/tickets/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ qrToken: cancellableBooking.qrToken });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('TICKET_CANCELLED');
    });

    it('should reject cancellation if show starts within cutoff window (< 2 hours)', async () => {
      // Create a show starting in 30 minutes
      const soonShow = await prisma.show.create({
        data: {
          movieId: testShow.movieId,
          screenId: testShow.screenId,
          startsAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
          endsAt: new Date(Date.now() + 150 * 60 * 1000),
          status: 'SCHEDULED',
        },
      });

      const seatForSoon = availableSeats[4].id;

      // Hold and book
      await request(app)
        .post(`/api/shows/${soonShow.id}/holds`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ seatIds: [seatForSoon] });

      const bookRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          showId: soonShow.id,
          seatIds: [seatForSoon],
          idempotencyKey: `idemp-soon-${Date.now()}`,
        });

      const soonBooking = bookRes.body.booking;

      // Attempt cancel within cutoff
      const cancelRes = await request(app)
        .post(`/api/bookings/${soonBooking.id}/cancel`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(cancelRes.status).toBe(409);
      expect(cancelRes.body.error.code).toBe('CANCEL_CUTOFF_EXCEEDED');

      // Cleanup soonShow
      await prisma.bookingSeat.deleteMany({ where: { showId: soonShow.id } });
      await prisma.booking.deleteMany({ where: { showId: soonShow.id } });
      await prisma.seatHold.deleteMany({ where: { showId: soonShow.id } });
      await prisma.show.delete({ where: { id: soonShow.id } });
    });
  });

  describe('5. User Booking History (/api/bookings/me)', () => {
    it('should return paginated booking history for authenticated user', async () => {
      const res = await request(app)
        .get('/api/bookings/me?page=1&pageSize=5')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
    });
  });
});
