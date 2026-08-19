import { Router } from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import systemSettingsRoutes from './systemSettingsRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import itemRoutes from './itemRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import supplierRoutes from './supplierRoutes.js';
import purchaseOrderRoutes from './purchaseOrderRoutes.js';
import alertRoutes from './alertRoutes.js';
import algorithmRoutes from './algorithmRoutes.js';
import reportRoutes from './reportRoutes.js';
import agentLogRoutes from './agentLogRoutes.js';
import agentRunRoutes from './agentRunRoutes.js';

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
router.use('/suppliers', supplierRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/alerts', alertRoutes);
router.use('/algorithms', algorithmRoutes);
router.use('/reports', reportRoutes);
router.use('/agent-logs', agentLogRoutes);
router.use('/agent-runs', agentRunRoutes);

export default router;
