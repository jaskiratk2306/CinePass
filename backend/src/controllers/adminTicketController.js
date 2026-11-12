import { validateTicket } from '../services/bookingService.js';

/**
 * Controller: Ticket validation (Admin only)
 * POST /api/admin/tickets/validate
 */
export async function validateTicketController(req, res, next) {
  try {
    const { qrToken } = req.body;
    const adminId = req.user.id;

    const result = await validateTicket({ qrToken, adminId });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
