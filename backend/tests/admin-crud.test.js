import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/db.js';

describe('Phase 3 - Admin CRUD & Show Overlap Prevention', () => {
  let adminToken;
  let userToken;
  let createdMovieId;
  let createdTheatreId;
  let createdScreenId;
  let sampleCategory;

  beforeAll(async () => {
    // Admin login
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.test', password: 'Admin@123' });
    adminToken = adminRes.body.token;

    // Regular user login
    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@demo.test', password: 'User@123' });
    userToken = userRes.body.token;

    sampleCategory = await prisma.seatCategory.findFirst({
      where: { name: 'VIP' },
    });
  });

  afterAll(async () => {
    // Cleanup created test objects
    if (createdMovieId) {
      await prisma.movie.deleteMany({ where: { id: createdMovieId } });
    }
    if (createdScreenId) {
      await prisma.screen.deleteMany({ where: { id: createdScreenId } });
    }
    if (createdTheatreId) {
      await prisma.theatre.deleteMany({ where: { id: createdTheatreId } });
    }
    await prisma.$disconnect();
  });

  describe('RBAC Guard on Admin Endpoints', () => {
    it('should deny non-admin access with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/admin/movies')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Unauthorized Movie' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Admin Movie CRUD', () => {
    it('should create a movie and write AuditLog', async () => {
      const res = await request(app)
        .post('/api/admin/movies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Admin Movie',
          description: 'A test movie created via admin endpoint.',
          durationMin: 120,
          language: 'English',
          format: '2D',
          posterUrl: 'https://example.com/poster.jpg',
          status: 'NOW_SHOWING',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.title).toBe('Test Admin Movie');
      createdMovieId = res.body.data.id;

      // Verify AuditLog
      const log = await prisma.auditLog.findFirst({
        where: {
          action: 'CREATE_MOVIE',
          entityId: createdMovieId,
        },
      });
      expect(log).toBeDefined();
    });

    it('should update movie details', async () => {
      const res = await request(app)
        .put(`/api/admin/movies/${createdMovieId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Admin Movie Updated',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Test Admin Movie Updated');
    });
  });

  describe('Admin Theatre & Screen Seat Auto-Generation', () => {
    it('should create theatre', async () => {
      const res = await request(app)
        .post('/api/admin/theatres')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Apex Arena Multiplex',
          city: 'Star City',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Apex Arena Multiplex');
      createdTheatreId = res.body.data.id;
    });

    it('should create screen and auto-generate seats with row ranges and categories', async () => {
      const res = await request(app)
        .post('/api/admin/screens')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          theatreId: createdTheatreId,
          name: 'Screen Gold',
          rows: 4,
          cols: 5,
          categoryRanges: [
            {
              startRow: 1,
              endRow: 2,
              categoryId: sampleCategory.id,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.rows).toBe(4);
      expect(res.body.data.cols).toBe(5);
      expect(res.body.data.seats.length).toBe(20); // 4 * 5 = 20 seats

      createdScreenId = res.body.data.id;

      // Check row A seats have sampleCategory
      const rowASeats = res.body.data.seats.filter((s) => s.rowLabel === 'A');
      expect(rowASeats.length).toBe(5);
      expect(rowASeats[0].categoryId).toBe(sampleCategory.id);
    });
  });

  describe('Admin Show Scheduling & Overlap Prevention', () => {
    let showAId;
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 10); // 10 days in future to not collide with seeds

    const showATimes = {
      startsAt: new Date(baseDate.setHours(14, 0, 0, 0)).toISOString(),
      endsAt: new Date(baseDate.setHours(16, 30, 0, 0)).toISOString(),
    };

    it('should successfully schedule a show on a screen', async () => {
      const res = await request(app)
        .post('/api/admin/shows')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          movieId: createdMovieId,
          screenId: createdScreenId,
          startsAt: showATimes.startsAt,
          endsAt: showATimes.endsAt,
          status: 'SCHEDULED',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      showAId = res.body.data.id;
    });

    it('should reject overlapping show on the same screen with 409 SHOW_TIME_OVERLAP', async () => {
      // Overlapping time window: 15:00 to 17:30 (overlaps with 14:00 - 16:30)
      const overlapStart = new Date(baseDate.setHours(15, 0, 0, 0)).toISOString();
      const overlapEnd = new Date(baseDate.setHours(17, 30, 0, 0)).toISOString();

      const res = await request(app)
        .post('/api/admin/shows')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          movieId: createdMovieId,
          screenId: createdScreenId,
          startsAt: overlapStart,
          endsAt: overlapEnd,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('SHOW_TIME_OVERLAP');
      expect(res.body.error.message).toContain('overlaps');
    });

    it('should allow scheduling a non-overlapping show on the same screen after show A finishes', async () => {
      // Non-overlapping time window: 17:00 to 19:30
      const nonOverlapStart = new Date(baseDate.setHours(17, 0, 0, 0)).toISOString();
      const nonOverlapEnd = new Date(baseDate.setHours(19, 30, 0, 0)).toISOString();

      const res = await request(app)
        .post('/api/admin/shows')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          movieId: createdMovieId,
          screenId: createdScreenId,
          startsAt: nonOverlapStart,
          endsAt: nonOverlapEnd,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
    });
  });
});
