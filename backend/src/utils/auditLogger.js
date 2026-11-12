import { createAuditLog } from '../repositories/auditLogRepository.js';

/**
 * Helper to record audit events safely without breaking main business logic if non-critical.
 * @param {object} params
 * @param {string|null} [params.actorId]
 * @param {string} params.action
 * @param {string} params.entityType
 * @param {string|null} [params.entityId]
 * @param {object|null} [params.metadata]
 * @param {import('@prisma/client').Prisma.TransactionClient} [tx]
 */
export async function logAuditEvent(params, tx = null) {
  try {
    return await createAuditLog(params, tx);
  } catch (err) {
    console.error(`Failed to write audit log for action: ${params.action}`, err);
    // When inside a transaction tx, rethrow so the transaction handles it
    if (tx) {
      throw err;
    }
    return null;
  }
}
