import { z } from 'zod';

export const listMoviesQuerySchema = z.object({
  q: z.string().optional(),
  genre: z.string().optional(),
  language: z.string().optional(),
  status: z.enum(['NOW_SHOWING', 'UPCOMING']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(10),
});

export const movieIdParamSchema = z.object({
  id: z.string().min(1, 'Movie ID is required'),
});

export const listShowsQuerySchema = z.object({
  movieId: z.string().optional(),
  theatreId: z.string().optional(),
  screenId: z.string().optional(),
  date: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const showIdParamSchema = z.object({
  id: z.string().min(1, 'Show ID is required'),
});
