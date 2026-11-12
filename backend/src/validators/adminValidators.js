import { z } from 'zod';

export const createMovieSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().min(5, 'Description must be at least 5 characters long'),
  durationMin: z.number().int().positive('Duration must be a positive integer in minutes'),
  language: z.string().trim().min(1, 'Language is required'),
  format: z.string().trim().min(1, 'Format is required (e.g. 2D, 3D, IMAX)'),
  posterUrl: z.string().trim().url('Valid poster URL is required'),
  status: z.enum(['NOW_SHOWING', 'UPCOMING']).default('NOW_SHOWING'),
  genreIds: z.array(z.string()).optional().default([]),
});

export const updateMovieSchema = createMovieSchema.partial();

export const createGenreSchema = z.object({
  name: z.string().trim().min(1, 'Genre name is required').max(50),
});

export const createTheatreSchema = z.object({
  name: z.string().trim().min(1, 'Theatre name is required').max(100),
  city: z.string().trim().min(1, 'City name is required').max(100),
});

export const updateTheatreSchema = createTheatreSchema.partial();

export const createScreenSchema = z.object({
  theatreId: z.string().min(1, 'Theatre ID is required'),
  name: z.string().trim().min(1, 'Screen name is required').max(50),
  rows: z.number().int().min(1).max(26, 'Maximum 26 rows supported (A-Z)'),
  cols: z.number().int().min(1).max(50, 'Maximum 50 columns per row supported'),
  categoryRanges: z
    .array(
      z.object({
        startRow: z.number().int().positive(),
        endRow: z.number().int().positive(),
        categoryId: z.string().min(1),
      })
    )
    .optional()
    .default([]),
});

export const createSeatCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(50),
  basePrice: z.number().positive('Base price must be a positive number'),
});

export const updateSeatCategorySchema = createSeatCategorySchema.partial();

export const createShowSchema = z.object({
  movieId: z.string().min(1, 'Movie ID is required'),
  screenId: z.string().min(1, 'Screen ID is required'),
  startsAt: z.string().datetime('startsAt must be a valid ISO 8601 datetime string'),
  endsAt: z.string().datetime('endsAt must be a valid ISO 8601 datetime string'),
  status: z.enum(['SCHEDULED', 'CANCELLED', 'COMPLETED']).optional().default('SCHEDULED'),
});

export const updateShowSchema = createShowSchema.partial();
