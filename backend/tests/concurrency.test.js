import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/db.js';

describe('Phase 4 - Concurrency & Double Booking Prevention', () => {
  let user1Token;
  let user2Token;
  let concurrentShow;
  let contestedSeat;

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

    // 3. Create isolated show and identify contested seat
    const movie = await prisma.movie.findFirst();
    const screen = await prisma.screen.findFirst({
      include: { seats: true },
    });
    contestedSeat = screen.seats[screen.seats.length - 1]; // pick last seat

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    concurrentShow = await prisma.show.create({
      data: {
        movieId: movie.id,
        screenId: screen.id,
        startsAt: futureDate,
        endsAt: new Date(futureDate.getTime() + 2 * 3600 * 1000),
        status: 'SCHEDULED',
      },
    });
  });

  afterAll(async () => {
    if (concurrentShow) {
      await prisma.bookingSeat.deleteMany({
        where: { showId: concurrentShow.id },
      });
      await prisma.booking.deleteMany({
        where: { showId: concurrentShow.id },
      });
      await prisma.seatHold.deleteMany({
        where: { showId: concurrentShow.id },
      });
      await prisma.show.delete({
        where: { id: concurrentShow.id },
      });
    }
    await prisma.$disconnect();
  });

  it('should allow exactly one winner and one 409 SEAT_UNAVAILABLE when two users confirm the same seat concurrently', async () => {
    // Both users establish active holds (e.g. simulated hold directly in DB to bypass the hold-lock race
    // so we test the exact booking confirmation concurrency protected by Postgres partial unique index)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const user1 = await prisma.user.findUnique({ where: { email: 'user1@demo.test' } });
    const user2 = await prisma.user.findUnique({ where: { email: 'user2@demo.test' } });

    // Seed holds for both users on the contested seat
    await prisma.seatHold.createMany({
      data: [
        {
          showId: concurrentShow.id,
          seatId: contestedSeat.id,
          userId: user1.id,
          expiresAt,
          status: 'ACTIVE',
        },
        {
          showId: concurrentShow.id,
          seatId: contestedSeat.id,
          userId: user2.id,
          expiresAt,
          status: 'ACTIVE',
        },
      ],
    });

    // Fire concurrent confirm requests simultaneously via Promise.all
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          showId: concurrentShow.id,
          seatIds: [contestedSeat.id],
          idempotencyKey: `race-key-user1-${Date.now()}`,
        }),
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          showId: concurrentShow.id,
          seatIds: [contestedSeat.id],
          idempotencyKey: `race-key-user2-${Date.now()}`,
        }),
    ]);

    const results = [res1, res2];
    const successes = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409);

    // Exactly one succeeds, exactly one fails
    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(1);

    expect(conflicts[0].body.error.code).toBe('SEAT_UNAVAILABLE');

    // Verify DB integrity: exactly ONE active booking seat in PostgreSQL
    const activeSeatsInDb = await prisma.bookingSeat.findMany({
      where: {
        showId: concurrentShow.id,
        seatId: contestedSeat.id,
        active: true,
      },
    });
    expect(activeSeatsInDb).toHaveLength(1);
  });
});
