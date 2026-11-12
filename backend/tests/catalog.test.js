import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/db.js';

describe('Phase 3 - Public Catalog APIs & Seat Map', () => {
  let sampleMovie;
  let sampleShow;

  beforeAll(async () => {
    sampleMovie = await prisma.movie.findFirst({
      where: { title: 'Inception Remastered' },
    });
    sampleShow = await prisma.show.findFirst({
      where: { movieId: sampleMovie.id },
      include: { screen: true },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/movies', () => {
    it('should list movies with pagination metadata', async () => {
      const res = await request(app).get('/api/movies?page=1&pageSize=3');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(3);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.pageSize).toBe(3);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(5);
    });

    it('should filter movies by search query (q)', async () => {
      const res = await request(app).get('/api/movies?q=Interstellar');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Interstellar Odyssey');
    });

    it('should filter movies by genre', async () => {
      const res = await request(app).get('/api/movies?genre=Sci-Fi');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      for (const m of res.body.data) {
        expect(m.genres).toContain('Sci-Fi');
      }
    });

    it('should filter movies by language', async () => {
      const res = await request(app).get('/api/movies?language=French');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Echoes of Silence');
    });
  });

  describe('GET /api/movies/:id', () => {
    it('should return movie details with upcoming shows and genres', async () => {
      const res = await request(app).get(`/api/movies/${sampleMovie.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(sampleMovie.id);
      expect(res.body.data.title).toBe(sampleMovie.title);
      expect(Array.isArray(res.body.data.genres)).toBe(true);
      expect(Array.isArray(res.body.data.shows)).toBe(true);
    });

    it('should return 404 NOT_FOUND for non-existent movie id', async () => {
      const res = await request(app).get('/api/movies/non-existent-id-999');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('MOVIE_NOT_FOUND');
    });
  });

  describe('GET /api/shows', () => {
    it('should list upcoming shows with movie and screen info', async () => {
      const res = await request(app).get('/api/shows?page=1&pageSize=10');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].movie).toBeDefined();
      expect(res.body.data[0].screen).toBeDefined();
      expect(res.body.meta).toBeDefined();
    });

    it('should filter shows by movieId', async () => {
      const res = await request(app).get(`/api/shows?movieId=${sampleMovie.id}`);

      expect(res.status).toBe(200);
      for (const s of res.body.data) {
        expect(s.movie.id).toBe(sampleMovie.id);
      }
    });
  });

  describe('GET /api/shows/:id/seats (Seat Map)', () => {
    it('should return screen layout, seats with status AVAILABLE, and prices', async () => {
      const res = await request(app).get(`/api/shows/${sampleShow.id}/seats`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.show).toBeDefined();
      expect(res.body.data.show.screen.rows).toBeDefined();
      expect(res.body.data.show.screen.cols).toBeDefined();

      const seats = res.body.data.seats;
      expect(Array.isArray(seats)).toBe(true);
      expect(seats.length).toBeGreaterThan(0);

      const firstSeat = seats[0];
      expect(firstSeat).toHaveProperty('id');
      expect(firstSeat).toHaveProperty('rowLabel');
      expect(firstSeat).toHaveProperty('number');
      expect(firstSeat).toHaveProperty('category');
      expect(firstSeat).toHaveProperty('price');
      expect(firstSeat.price).toBeGreaterThan(0);
      expect(['AVAILABLE', 'HELD', 'BOOKED']).toContain(firstSeat.status);
    });

    it('should return 404 for invalid show id', async () => {
      const res = await request(app).get('/api/shows/invalid-show-id/seats');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SHOW_NOT_FOUND');
    });
  });
});
