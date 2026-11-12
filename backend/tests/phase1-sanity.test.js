import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

describe('Phase 1 - Database Schema, Migrations, Constraints & Seed Verification', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should connect to database and have seeded users with correct password hashes', async () => {
    const users = await prisma.user.findMany();
    expect(users.length).toBe(3);

    const admin = users.find((u) => u.email === 'admin@demo.test');
    expect(admin).toBeDefined();
    expect(admin.role).toBe('ADMIN');
    const isAdminPasswordValid = await bcrypt.compare('Admin@123', admin.passwordHash);
    expect(isAdminPasswordValid).toBe(true);

    const user1 = users.find((u) => u.email === 'user1@demo.test');
    expect(user1).toBeDefined();
    expect(user1.role).toBe('USER');
    const isUserPasswordValid = await bcrypt.compare('User@123', user1.passwordHash);
    expect(isUserPasswordValid).toBe(true);
  });

  it('should have seeded genres, movies, theatres, screens, and shows', async () => {
    const genresCount = await prisma.genre.count();
    expect(genresCount).toBe(3);

    const moviesCount = await prisma.movie.count();
    expect(moviesCount).toBe(5);

    const categoriesCount = await prisma.seatCategory.count();
    expect(categoriesCount).toBe(3);

    const theatresCount = await prisma.theatre.count();
    expect(theatresCount).toBe(2);

    const screensCount = await prisma.screen.count();
    expect(screensCount).toBe(3);

    const seatsCount = await prisma.seat.count();
    expect(seatsCount).toBe(164);

    const showsCount = await prisma.show.count();
    expect(showsCount).toBe(16);
  });

  it('should verify the critical partial unique index on BookingSeat in PostgreSQL', async () => {
    const indexQuery = await prisma.$queryRaw`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'BookingSeat' 
        AND indexname = 'booking_seats_active_show_seat_idx';
    `;

    expect(Array.isArray(indexQuery)).toBe(true);
    expect(indexQuery.length).toBe(1);
    expect(indexQuery[0].indexdef).toContain('WHERE (active = true)');
    expect(indexQuery[0].indexdef).toContain('UNIQUE INDEX booking_seats_active_show_seat_idx');
  });
});
