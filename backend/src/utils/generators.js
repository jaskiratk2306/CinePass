import crypto from 'crypto';

/**
 * Generates human-readable unique booking reference: CIN-XXXXXX
 * @returns {string} e.g. "CIN-A7F9B2"
 */
export function generateBookingReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars like 0, O, 1, I
  let code = '';
  const randomBytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return `CIN-${code}`;
}

/**
 * Generates secure random 32-byte hex QR validation token
 * @returns {string} 64 character hex string
 */
export function generateQrToken() {
  return crypto.randomBytes(32).toString('hex');
}
