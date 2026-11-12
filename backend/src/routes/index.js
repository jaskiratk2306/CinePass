import { Router } from 'express';
import authRoutes from './authRoutes.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth module
router.use('/auth', authRoutes);

// Protected admin test route for RBAC testing
router.get('/admin/rbac-test', requireAuth, requireRole('ADMIN'), (req, res) => {
  res.status(200).json({ message: 'Welcome Admin', user: req.user });
});

export default router;
