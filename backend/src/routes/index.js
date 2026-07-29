import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import systemSettingsRoutes from './systemSettingsRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import itemRoutes from './itemRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' }, message: 'Service healthy' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/settings', systemSettingsRoutes);
router.use('/categories', categoryRoutes);
router.use('/items', itemRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
