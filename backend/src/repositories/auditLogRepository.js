import { prisma } from '../config/db.js';

/**
 * Creates an audit log entry in the database.
 * @param {object} params
 * @param {string|null} [params.actorId]
 * @param {string} params.action
 * @param {string} params.entityType
 * @param {string|null} [params.entityId]
 * @param {object|null} [params.metadata]
 * @param {import('@prisma/client').Prisma.TransactionClient} [tx]
 */
export async function createAuditLog(
  { actorId = null, action, entityType, entityId = null, metadata = null },
  tx = null
) {
  const client = tx || prisma;
  return client.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      metadata: metadata || {},
    },
  });
}

/**
 * Get paginated audit logs
 * @param {{ page?: number, pageSize?: number, entityType?: string, action?: string }} options
 */
export async function getAuditLogs({ page = 1, pageSize = 20, entityType, action }) {
  const skip = (page - 1) * pageSize;
  const where = {};

  if (entityType) where.entityType = entityType;
  if (action) where.action = action;

  const [total, data] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
