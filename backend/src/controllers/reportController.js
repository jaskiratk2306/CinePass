import { getOccupancyReport } from '../services/reportService.js';
import { getAuditLogs } from '../repositories/auditLogRepository.js';

/**
 * Controller: Get reconciled occupancy & revenue report
 * GET /api/admin/reports/occupancy
 */
export async function getOccupancyReportController(req, res, next) {
  try {
    const { showId, startDate, endDate } = req.query;
    const report = await getOccupancyReport({ showId, startDate, endDate });
    return res.status(200).json({ data: report });
  } catch (err) {
    return next(err);
  }
}

/**
 * Controller: Get paginated audit logs
 * GET /api/admin/audit-logs
 */
export async function getAuditLogsController(req, res, next) {
  try {
    const { page, pageSize, entityType, action } = req.query;
    const result = await getAuditLogs({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      entityType,
      action,
    });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
