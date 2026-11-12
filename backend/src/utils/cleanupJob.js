import { prisma } from '../config/db.js';

let cleanupInterval = null;

/**
 * Periodically marks expired ACTIVE holds as RELEASED.
 * This runs alongside lazy expiry.
 * @param {number} [intervalMs] default 60 seconds
 */
export function startHoldCleanupJob(intervalMs = 60000) {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(async () => {
    try {
      const now = new Date();
      const result = await prisma.seatHold.updateMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { lt: now },
        },
        data: {
          status: 'RELEASED',
        },
      });
      if (result.count > 0 && process.env.NODE_ENV !== 'test') {
        console.log(`[HoldCleanupJob] Released ${result.count} expired seat holds at ${now.toISOString()}`);
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('[HoldCleanupJob] Error releasing expired holds:', err.message);
      }
    }
  }, intervalMs);

  // Unref interval so it does not keep process open if tests exit
  if (cleanupInterval && typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }
}

export function stopHoldCleanupJob() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
