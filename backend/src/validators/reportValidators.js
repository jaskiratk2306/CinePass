import { z } from 'zod';

export const occupancyReportQuerySchema = z.object({
  showId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const auditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  entityType: z.string().optional(),
  action: z.string().optional(),
});
