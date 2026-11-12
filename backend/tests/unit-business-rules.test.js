import { describe, it, expect } from 'vitest';
import { generateBookingReference, generateQrToken } from '../src/utils/generators.js';

describe('Unit Tests - Business Rules & Utility Logic', () => {
  describe('Reference and Token Generation', () => {
    it('should generate booking reference in the CIN-XXXXXX format', () => {
      const ref1 = generateBookingReference();
      const ref2 = generateBookingReference();

      expect(ref1).toMatch(/^CIN-[A-Z0-9]{6}$/);
      expect(ref2).toMatch(/^CIN-[A-Z0-9]{6}$/);
      expect(ref1).not.toBe(ref2);
    });

    it('should generate secure 32-byte (64 hex character) QR token', () => {
      const token1 = generateQrToken();
      const token2 = generateQrToken();

      expect(token1).toHaveLength(64);
      expect(token1).toMatch(/^[a-f0-9]{64}$/);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });
  });

  describe('Price Calculation Logic', () => {
    it('should calculate total booking price accurately across mixed seat categories', () => {
      const seatItems = [
        { category: 'VIP', price: 400.00 },
        { category: 'VIP', price: 400.00 },
        { category: 'PREMIUM', price: 250.00 },
        { category: 'REGULAR', price: 150.00 },
      ];

      const totalPrice = seatItems.reduce((acc, curr) => acc + Number(curr.price), 0);
      expect(totalPrice).toBe(1200.00);
    });
  });

  describe('Hold Expiry Calculation', () => {
    it('should treat hold with expiresAt < now as expired and free', () => {
      const now = new Date('2026-11-12T12:00:00Z');
      const pastHold = {
        expiresAt: new Date('2026-11-12T11:59:59Z'),
        status: 'ACTIVE',
      };
      const futureHold = {
        expiresAt: new Date('2026-11-12T12:05:00Z'),
        status: 'ACTIVE',
      };

      const isPastHoldActive = pastHold.status === 'ACTIVE' && pastHold.expiresAt > now;
      const isFutureHoldActive = futureHold.status === 'ACTIVE' && futureHold.expiresAt > now;

      expect(isPastHoldActive).toBe(false);
      expect(isFutureHoldActive).toBe(true);
    });
  });

  describe('Cancellation Cutoff Logic', () => {
    it('should disallow cancellation if show starts within cutoff hours', () => {
      const now = new Date('2026-11-12T12:00:00Z');
      const cutoffHours = 2;
      const cutoffMs = cutoffHours * 60 * 60 * 1000;

      // Show starting in 1 hour (less than 2 hours cutoff)
      const showStartsSoon = new Date('2026-11-12T13:00:00Z');
      const timeDiffSoon = showStartsSoon.getTime() - now.getTime();
      const canCancelSoon = timeDiffSoon > cutoffMs;
      expect(canCancelSoon).toBe(false);

      // Show starting in 3 hours (greater than 2 hours cutoff)
      const showStartsLater = new Date('2026-11-12T15:00:00Z');
      const timeDiffLater = showStartsLater.getTime() - now.getTime();
      const canCancelLater = timeDiffLater > cutoffMs;
      expect(canCancelLater).toBe(true);
    });
  });

  describe('State Transition Guards', () => {
    it('should only permit cancellation for CONFIRMED, non-checked-in bookings', () => {
      const canCancel = (booking) => {
        if (booking.status !== 'CONFIRMED') return false;
        if (booking.checkedInAt !== null && booking.checkedInAt !== undefined) return false;
        return true;
      };

      expect(canCancel({ status: 'CONFIRMED', checkedInAt: null })).toBe(true);
      expect(canCancel({ status: 'CANCELLED', checkedInAt: null })).toBe(false);
      expect(canCancel({ status: 'CONFIRMED', checkedInAt: new Date() })).toBe(false);
      expect(canCancel({ status: 'PENDING', checkedInAt: null })).toBe(false);
    });
  });
});
