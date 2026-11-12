import { Router } from 'express';
import authRoutes from './authRoutes.js';
import catalogRoutes from './catalogRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import adminRoutes from './adminRoutes.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth endpoints
router.use('/auth', authRoutes);

// Public catalog endpoints (movies, shows, seat map)
router.use('/', catalogRoutes);

// User booking flow endpoints (holds, bookings, cancel, me)
router.use('/', bookingRoutes);

// Admin catalog & management endpoints
router.use('/admin', adminRoutes);

// Protected admin test route for RBAC testing
router.get('/admin/rbac-test', requireAuth, requireRole('ADMIN'), (req, res) => {
  res.status(200).json({ message: 'Welcome Admin', user: req.user });
});

export default router;
