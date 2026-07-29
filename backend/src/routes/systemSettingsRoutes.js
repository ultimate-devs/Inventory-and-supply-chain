import { Router } from 'express';
import * as controller from '../controllers/systemSettingsController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiters.js';
import { updateSettingsValidators } from '../validators/systemSettingsValidators.js';
import { ROLES } from '../config/roles.js';

const router = Router();

router.use(protect);

/**
 * @openapi
 * /settings:
 *   get:
 *     summary: Get system settings
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: System settings retrieved }
 */
router.get('/', controller.getSettings);

/**
 * @openapi
 * /settings:
 *   put:
 *     summary: Update system settings (Super Admin only)
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: System settings updated }
 */
router.put('/', authorize(ROLES.SUPER_ADMIN), writeLimiter, updateSettingsValidators, validate, controller.updateSettings);

export default router;
