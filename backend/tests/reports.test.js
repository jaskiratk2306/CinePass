import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/db.js';

describe('Phase 5 - Reports, Reconciliation & OpenAPI Documentation', () => {
  let adminToken;
  let userToken;
  let reportShow;
  let testSeats;

  beforeAll(async () => {
    // 1. Authenticate admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.test', password: 'Admin@123' });
    adminToken = adminRes.body.token;

    // 2. Authenticate user
    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@demo.test', password: 'User@123' });
    userToken = userRes.body.token;

    // 3. Setup test show for reporting
    const movie = await prisma.movie.findFirst();
    const screen = await prisma.screen.findFirst({
      include: {
        seats: {
          include: { category: true },
          take: 5,
        },
      },
    });
    testSeats = screen.seats;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);

    reportShow = await prisma.show.create({
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
    if (reportShow) {
      await prisma.bookingSeat.deleteMany({ where: { showId: reportShow.id } });
      await prisma.payment.deleteMany({
        where: { booking: { showId: reportShow.id } },
      });
      await prisma.booking.deleteMany({ where: { showId: reportShow.id } });
      await prisma.seatHold.deleteMany({ where: { showId: reportShow.id } });
      await prisma.show.delete({ where: { id: reportShow.id } });
    }
    await prisma.$disconnect();
  });

  describe('Occupancy and Financial Reconciliation Sequence', () => {
    let bookingId;
    let expectedPrice;

    it('should reconcile initial empty state for show report', async () => {
      const res = await request(app)
        .get(`/api/admin/reports/occupancy?showId=${reportShow.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const report = res.body.data;
      expect(report.shows).toHaveLength(1);

      const showReport = report.shows[0];
      expect(showReport.bookedSeats).toBe(0);
      expect(showReport.cancelledSeats).toBe(0);
      expect(showReport.grossRevenue).toBe(0);
      expect(showReport.refunds).toBe(0);
      expect(showReport.netRevenue).toBe(0);
    });

    it('should reconcile after 2 seats are booked', async () => {
      const seatIds = [testSeats[0].id, testSeats[1].id];
      expectedPrice = Number(testSeats[0].category.basePrice) + Number(testSeats[1].category.basePrice);

      // Hold seats
      await request(app)
        .post(`/api/shows/${reportShow.id}/holds`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ seatIds });

      // Confirm booking
      const bookRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          showId: reportShow.id,
          seatIds,
          idempotencyKey: `report-book-${Date.now()}`,
        });

      expect(bookRes.status).toBe(201);
      bookingId = bookRes.body.booking.id;

      // Check report
      const repRes = await request(app)
        .get(`/api/admin/reports/occupancy?showId=${reportShow.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(repRes.status).toBe(200);
      const showReport = repRes.body.data.shows[0];

      // Reconcile: booked seats = confirmed active seats
      expect(showReport.bookedSeats).toBe(2);
      expect(showReport.cancelledSeats).toBe(0);
      expect(showReport.grossRevenue).toBe(expectedPrice);
      expect(showReport.refunds).toBe(0);
      expect(showReport.netRevenue).toBe(expectedPrice);
    });

    it('should reconcile after booking is cancelled (refunded = gross, net = 0, booked = 0)', async () => {
      // Cancel booking
      const cancelRes = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(cancelRes.status).toBe(200);

      // Check report
      const repRes = await request(app)
        .get(`/api/admin/reports/occupancy?showId=${reportShow.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(repRes.status).toBe(200);
      const showReport = repRes.body.data.shows[0];

      // Reconcile: booked seats freed immediately
      expect(showReport.bookedSeats).toBe(0);
      expect(showReport.cancelledSeats).toBe(2);
      expect(showReport.grossRevenue).toBe(expectedPrice);
      expect(showReport.refunds).toBe(expectedPrice);
      // Net revenue = grossRevenue - refunds = 0
      expect(showReport.netRevenue).toBe(0);
    });

    it('should reject non-admin access to occupancy report with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/admin/reports/occupancy')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Audit Logs API', () => {
    it('should return paginated audit logs for admin', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs?page=1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
    });
  });

  describe('OpenAPI Documentation Endpoint', () => {
    it('should serve raw OpenAPI spec at /api/docs/json', async () => {
      const res = await request(app).get('/api/docs/json');

      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.3');
      expect(res.body.info.title).toContain('Cinema Hall Ticket Booking');
      expect(res.body.paths).toHaveProperty('/bookings');
      expect(res.body.paths).toHaveProperty('/shows/{id}/holds');
      expect(res.body.paths).toHaveProperty('/admin/tickets/validate');
      expect(res.body.paths).toHaveProperty('/admin/reports/occupancy');
    });

    it('should serve Swagger UI at /api/docs/', async () => {
      const res = await request(app).get('/api/docs/');

      expect(res.status).toBe(200);
      expect(res.text).toContain('swagger');
    });
  });
});
