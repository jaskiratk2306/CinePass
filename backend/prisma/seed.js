import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seeds initial database state with admin, users, genres, movies, theatres, screens, seats, and shows.
 */
async function main() {
  console.log('--- Starting Seed (JavaScript ESM) ---');

  // 1. Clean existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.bookingSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.seatHold.deleteMany();
  await prisma.show.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.seatCategory.deleteMany();
  await prisma.screen.deleteMany();
  await prisma.theatre.deleteMany();
  await prisma.movieGenre.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleaned old records.');

  // 2. Users (1 admin, 2 regular users)
  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash('Admin@123', saltRounds);
  const userPasswordHash = await bcrypt.hash('User@123', saltRounds);

  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@demo.test',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  const user1 = await prisma.user.create({
    data: {
      name: 'John Doe',
      email: 'user1@demo.test',
      passwordHash: userPasswordHash,
      role: 'USER',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Jane Smith',
      email: 'user2@demo.test',
      passwordHash: userPasswordHash,
      role: 'USER',
    },
  });

  console.log(`Created 3 users: ${admin.email}, ${user1.email}, ${user2.email}`);

  // 3. Genres (3 genres)
  const actionGenre = await prisma.genre.create({ data: { name: 'Action' } });
  const sciFiGenre = await prisma.genre.create({ data: { name: 'Sci-Fi' } });
  const dramaGenre = await prisma.genre.create({ data: { name: 'Drama' } });

  console.log('Created 3 genres: Action, Sci-Fi, Drama');

  // 4. Movies (5 movies)
  const movie1 = await prisma.movie.create({
    data: {
      title: 'Inception Remastered',
      description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.',
      durationMin: 148,
      language: 'English',
      format: 'IMAX 2D',
      posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80',
      status: 'NOW_SHOWING',
      genres: {
        create: [
          { genreId: actionGenre.id },
          { genreId: sciFiGenre.id },
        ],
      },
    },
  });

  const movie2 = await prisma.movie.create({
    data: {
      title: 'Interstellar Odyssey',
      description: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot is tasked to pilot a spacecraft along with a team of researchers.',
      durationMin: 169,
      language: 'English',
      format: 'IMAX 70mm',
      posterUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80',
      status: 'NOW_SHOWING',
      genres: {
        create: [
          { genreId: sciFiGenre.id },
          { genreId: dramaGenre.id },
        ],
      },
    },
  });

  const movie3 = await prisma.movie.create({
    data: {
      title: 'The Dark Knight Returns',
      description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.',
      durationMin: 152,
      language: 'English',
      format: '2D',
      posterUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80',
      status: 'NOW_SHOWING',
      genres: {
        create: [
          { genreId: actionGenre.id },
          { genreId: dramaGenre.id },
        ],
      },
    },
  });

  const movie4 = await prisma.movie.create({
    data: {
      title: 'Cyberpunk 2099',
      description: 'In a neon-drenched metropolis, an augmented mercenary undertakes a high-stakes heist against the ruling mega-corporations.',
      durationMin: 130,
      language: 'English',
      format: '3D',
      posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      status: 'NOW_SHOWING',
      genres: {
        create: [
          { genreId: actionGenre.id },
          { genreId: sciFiGenre.id },
        ],
      },
    },
  });

  const movie5 = await prisma.movie.create({
    data: {
      title: 'Echoes of Silence',
      description: 'A poignant and emotional story following an elderly musician navigating memory loss through melodies from the past.',
      durationMin: 115,
      language: 'French',
      format: '2D',
      posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80',
      status: 'UPCOMING',
      genres: {
        create: [
          { genreId: dramaGenre.id },
        ],
      },
    },
  });

  console.log('Created 5 movies with genres.');

  // 5. Seat Categories (3 categories)
  const catRegular = await prisma.seatCategory.create({
    data: {
      name: 'REGULAR',
      basePrice: 150.00,
    },
  });

  const catPremium = await prisma.seatCategory.create({
    data: {
      name: 'PREMIUM',
      basePrice: 250.00,
    },
  });

  const catVip = await prisma.seatCategory.create({
    data: {
      name: 'VIP',
      basePrice: 400.00,
    },
  });

  console.log('Created 3 seat categories: REGULAR, PREMIUM, VIP');

  // 6. Theatres (2 theatres) & Screens (3 screens)
  const theatre1 = await prisma.theatre.create({
    data: {
      name: 'Grand Cinema',
      city: 'Metropolis',
    },
  });

  const theatre2 = await prisma.theatre.create({
    data: {
      name: 'Starlight Multiplex',
      city: 'Gotham',
    },
  });

  /**
   * Generates seats for a given screen.
   * @param {string} screenId
   * @param {number} rows
   * @param {number} cols
   * @param {(rowIdx: number) => string} categoryMapping
   */
  const createSeatsForScreen = async (screenId, rows, cols, categoryMapping) => {
    const seatsData = [];
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let r = 0; r < rows; r++) {
      const rowLabel = alphabet[r];
      const categoryId = categoryMapping(r);
      for (let c = 1; c <= cols; c++) {
        seatsData.push({
          screenId,
          rowLabel,
          number: c,
          categoryId,
        });
      }
    }

    await prisma.seat.createMany({
      data: seatsData,
    });
    return seatsData.length;
  };

  // Screen 1 in Grand Cinema (8 rows x 10 cols = 80 seats)
  // Rows A-B: VIP, C-E: PREMIUM, F-H: REGULAR
  const screen1 = await prisma.screen.create({
    data: {
      theatreId: theatre1.id,
      name: 'Audi 1 - Dolby Atmos',
      rows: 8,
      cols: 10,
    },
  });
  const count1 = await createSeatsForScreen(screen1.id, 8, 10, (r) => {
    if (r < 2) return catVip.id;
    if (r < 5) return catPremium.id;
    return catRegular.id;
  });

  // Screen 2 in Grand Cinema (6 rows x 8 cols = 48 seats)
  // Row A: VIP, B-D: PREMIUM, E-F: REGULAR
  const screen2 = await prisma.screen.create({
    data: {
      theatreId: theatre1.id,
      name: 'Audi 2 - IMAX',
      rows: 6,
      cols: 8,
    },
  });
  const count2 = await createSeatsForScreen(screen2.id, 6, 8, (r) => {
    if (r < 1) return catVip.id;
    if (r < 4) return catPremium.id;
    return catRegular.id;
  });

  // Screen 3 in Starlight Multiplex (6 rows x 6 cols = 36 seats)
  // Row A: VIP, B-C: PREMIUM, D-F: REGULAR
  const screen3 = await prisma.screen.create({
    data: {
      theatreId: theatre2.id,
      name: 'Screen 1 - Classic',
      rows: 6,
      cols: 6,
    },
  });
  const count3 = await createSeatsForScreen(screen3.id, 6, 6, (r) => {
    if (r < 1) return catVip.id;
    if (r < 3) return catPremium.id;
    return catRegular.id;
  });

  console.log(`Created 3 screens with total ${count1 + count2 + count3} seats.`);

  // 7. Shows (~15 upcoming shows across the screens without overlap)
  const now = new Date();
  const baseDay1 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const baseDay2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  const baseDay3 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);

  const makeTime = (base, hours, minutes = 0) => {
    const d = new Date(base);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const showConfigs = [
    // Screen 1 (Metropolis - Audi 1)
    // Day 1
    { screenId: screen1.id, movieId: movie1.id, start: makeTime(baseDay1, 10, 0), end: makeTime(baseDay1, 12, 30) },
    { screenId: screen1.id, movieId: movie2.id, start: makeTime(baseDay1, 14, 0), end: makeTime(baseDay1, 17, 0) },
    { screenId: screen1.id, movieId: movie3.id, start: makeTime(baseDay1, 18, 30), end: makeTime(baseDay1, 21, 15) },
    // Day 2
    { screenId: screen1.id, movieId: movie4.id, start: makeTime(baseDay2, 10, 30), end: makeTime(baseDay2, 12, 45) },
    { screenId: screen1.id, movieId: movie1.id, start: makeTime(baseDay2, 14, 30), end: makeTime(baseDay2, 17, 0) },
    { screenId: screen1.id, movieId: movie2.id, start: makeTime(baseDay2, 19, 0), end: makeTime(baseDay2, 22, 0) },

    // Screen 2 (Metropolis - Audi 2 IMAX)
    // Day 1
    { screenId: screen2.id, movieId: movie2.id, start: makeTime(baseDay1, 11, 0), end: makeTime(baseDay1, 14, 0) },
    { screenId: screen2.id, movieId: movie4.id, start: makeTime(baseDay1, 15, 30), end: makeTime(baseDay1, 17, 45) },
    { screenId: screen2.id, movieId: movie1.id, start: makeTime(baseDay1, 19, 30), end: makeTime(baseDay1, 22, 0) },
    // Day 2
    { screenId: screen2.id, movieId: movie3.id, start: makeTime(baseDay2, 11, 0), end: makeTime(baseDay2, 13, 40) },
    { screenId: screen2.id, movieId: movie1.id, start: makeTime(baseDay2, 15, 0), end: makeTime(baseDay2, 17, 30) },
    { screenId: screen2.id, movieId: movie4.id, start: makeTime(baseDay2, 18, 45), end: makeTime(baseDay2, 21, 0) },

    // Screen 3 (Gotham - Screen 1 Classic)
    // Day 1
    { screenId: screen3.id, movieId: movie3.id, start: makeTime(baseDay1, 13, 0), end: makeTime(baseDay1, 15, 40) },
    { screenId: screen3.id, movieId: movie1.id, start: makeTime(baseDay1, 17, 0), end: makeTime(baseDay1, 19, 30) },
    // Day 2
    { screenId: screen3.id, movieId: movie4.id, start: makeTime(baseDay2, 14, 0), end: makeTime(baseDay2, 16, 15) },
    // Day 3
    { screenId: screen3.id, movieId: movie2.id, start: makeTime(baseDay3, 16, 0), end: makeTime(baseDay3, 19, 0) },
  ];

  for (const conf of showConfigs) {
    await prisma.show.create({
      data: {
        screenId: conf.screenId,
        movieId: conf.movieId,
        startsAt: conf.start,
        endsAt: conf.end,
        status: 'SCHEDULED',
      },
    });
  }

  console.log(`Created ${showConfigs.length} upcoming shows.`);

  // 8. Audit log for initial seed
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'SYSTEM_SEED',
      entityType: 'SYSTEM',
      entityId: 'SEED',
      metadata: {
        users: 3,
        movies: 5,
        theatres: 2,
        screens: 3,
        shows: showConfigs.length,
      },
    },
  });

  console.log('--- Seed Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
